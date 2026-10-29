// Headless OAuth Mock Service matching wiradev-be auth contracts
import crypto from "node:crypto";
import { CONFIG } from "../config.mjs";
import { createJwt, verifyJwt } from "./test-utils.mjs";

export class HeadlessOAuthService {
  constructor(options = {}) {
    this.accessSecret = options.accessSecret || CONFIG.JWT_ACCESS_SECRET;
    this.refreshSecret = options.refreshSecret || CONFIG.JWT_REFRESH_SECRET;
    this.googleClientId = options.googleClientId || CONFIG.GOOGLE_CLIENT_ID;
    
    // In-memory data store for stateful testing
    this.users = new Map();
    this.providers = new Map(); // provider:provider_user_id -> user_id
    this.activeRefreshTokens = new Set();
  }

  reset() {
    this.users.clear();
    this.providers.clear();
    this.activeRefreshTokens.clear();
  }

  // -----------------------------------------------------------
  // Helper: Mint mock external provider tokens/codes
  // -----------------------------------------------------------
  mintMockGoogleIdToken(user = {}) {
    const payload = {
      sub: user.sub || `google_sub_${crypto.randomBytes(4).toString("hex")}`,
      email: user.email || `google_user_${Date.now()}@example.com`,
      given_name: user.given_name || "Google",
      family_name: user.family_name || "Tester",
      picture: user.picture || "https://lh3.googleusercontent.com/a/default-user",
      aud: this.googleClientId,
      iss: "https://accounts.google.com",
    };
    return createJwt(payload, "google_public_key_mock", 3600);
  }

  mintMockGithubCode(metadata = {}) {
    const code = `gh_code_${crypto.randomBytes(8).toString("hex")}`;
    return {
      code,
      profile: {
        id: metadata.id || Math.floor(Math.random() * 1000000),
        login: metadata.login || `gh_user_${Date.now()}`,
        email: metadata.email || `gh_user_${Date.now()}@example.com`,
        name: metadata.name || "GitHub Tester",
        avatar_url: metadata.avatar_url || "https://avatars.githubusercontent.com/u/default",
      },
    };
  }

  generateTokens(userId) {
    const accessToken = createJwt({ sub: userId }, this.accessSecret, 15 * 60); // 15m
    const refreshToken = createJwt({ sub: userId }, this.refreshSecret, 7 * 24 * 60 * 60); // 7d
    this.activeRefreshTokens.add(refreshToken);
    return { accessToken, refreshToken };
  }

  // -----------------------------------------------------------
  // Contract Handlers
  // -----------------------------------------------------------
  async handleGoogleLogin(idToken, isSignUp = false) {
    if (!idToken) {
      throw new Error("idToken is required");
    }

    // Decode ID token payload
    const parts = idToken.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid Google token format");
    }

    let payload;
    try {
      payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
    } catch {
      throw new Error("Invalid Google token");
    }

    if (!payload.sub || !payload.email) {
      throw new Error("Invalid Google token claims");
    }

    if (payload.aud && payload.aud !== this.googleClientId) {
      throw new Error("Invalid Google client ID audience");
    }

    const providerKey = `google:${payload.sub}`;
    let userId = this.providers.get(providerKey);
    let user = userId ? this.users.get(userId) : null;

    if (!user) {
      // Find by email
      for (const u of this.users.values()) {
        if (u.email === payload.email) {
          user = u;
          break;
        }
      }

      if (!user) {
        if (!isSignUp) {
          throw new Error("Account not found. Please register first.");
        }
        userId = `usr_${crypto.randomBytes(6).toString("hex")}`;
        user = {
          id: userId,
          email: payload.email,
          first_name: payload.given_name || "",
          last_name: payload.family_name || "",
          avatar_url: payload.picture || null,
          onboarding_completed: false,
          is_email_verified: true,
          providers: ["google"],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        this.users.set(userId, user);
      }

      this.providers.set(providerKey, user.id);
    }

    const tokens = this.generateTokens(user.id);
    return {
      message: "Successfully authenticated with Google",
      result: {
        user,
        tokens,
      },
    };
  }

  async handleGithubLogin(mockGithubProfile, isSignUp = false) {
    if (!mockGithubProfile || !mockGithubProfile.id) {
      throw new Error("code is required");
    }

    const providerKey = `github:${mockGithubProfile.id}`;
    let userId = this.providers.get(providerKey);
    let user = userId ? this.users.get(userId) : null;

    if (!user) {
      for (const u of this.users.values()) {
        if (u.email === mockGithubProfile.email) {
          user = u;
          break;
        }
      }

      if (!user) {
        if (!isSignUp) {
          throw new Error("Account not found. Please register first.");
        }
        userId = `usr_${crypto.randomBytes(6).toString("hex")}`;
        user = {
          id: userId,
          email: mockGithubProfile.email,
          first_name: mockGithubProfile.name?.split(" ")[0] || mockGithubProfile.login,
          last_name: mockGithubProfile.name?.split(" ")[1] || "",
          avatar_url: mockGithubProfile.avatar_url || null,
          github_username: mockGithubProfile.login,
          onboarding_completed: false,
          is_email_verified: true,
          providers: ["github"],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        this.users.set(userId, user);
      }

      this.providers.set(providerKey, user.id);
    }

    const tokens = this.generateTokens(user.id);
    return {
      message: "Successfully authenticated with GitHub",
      result: {
        user,
        tokens,
      },
    };
  }

  async handleGetProfile(token) {
    if (!token) return null;
    const verified = verifyJwt(token, this.accessSecret);
    if (!verified || !verified.sub) return null;
    return this.users.get(verified.sub) || null;
  }

  async handleRefresh(refreshToken) {
    if (!refreshToken) {
      throw new Error("Refresh token is required");
    }
    const verified = verifyJwt(refreshToken, this.refreshSecret);
    if (!verified || !verified.sub) {
      throw new Error("Invalid refresh token");
    }
    const user = this.users.get(verified.sub);
    if (!user) {
      throw new Error("User not found");
    }
    return this.generateTokens(user.id);
  }

  handleLogout(refreshToken) {
    if (refreshToken) {
      this.activeRefreshTokens.delete(refreshToken);
    }
    return { message: "Successfully logged out" };
  }
}
