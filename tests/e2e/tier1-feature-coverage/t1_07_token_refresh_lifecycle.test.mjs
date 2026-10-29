// Tier 1: Feature Coverage - Token Refresh Lifecycle
import { createSuite, assert, assertEqual, assertStatus } from "../lib/test-utils.mjs";
import { OpaqueHttpClient } from "../lib/http-client.mjs";
import { HeadlessOAuthService } from "../lib/oauth-mock-service.mjs";
import { CONFIG } from "../config.mjs";

export async function run() {
  const suite = createSuite("Tier 1: Token Refresh Lifecycle");
  const client = new OpaqueHttpClient(CONFIG.BACKEND_URL);
  const oauthService = new HeadlessOAuthService();

  suite.test("T1.07.1: POST /api/auth/refresh without token returns 400 Refresh token is required", async () => {
    const res = await client.post("/api/auth/refresh", {});
    assertStatus(res, 400, "Should return 400 when refresh token missing");
    assertEqual(res.data?.message, "Refresh token is required");
  });

  suite.test("T1.07.2: POST /api/auth/refresh with bogus token returns 401", async () => {
    const res = await client.post("/api/auth/refresh", { refreshToken: "bogus_refresh_token" });
    assertStatus(res, 401, "Invalid refresh token must return 401");
  });

  suite.test("T1.07.3: Headless engine refreshes tokens successfully given valid refresh token", async () => {
    const mockIdToken = oauthService.mintMockGoogleIdToken({
      email: "refresh_test@example.com",
    });
    const loginRes = await oauthService.handleGoogleLogin(mockIdToken, true);
    const { refreshToken: originalRefreshToken } = loginRes.result.tokens;

    const refreshedTokens = await oauthService.handleRefresh(originalRefreshToken);
    assert(!!refreshedTokens.accessToken, "Must issue new accessToken");
    assert(!!refreshedTokens.refreshToken, "Must issue new refreshToken");
  });

  suite.test("T1.07.4: Refreshed access token successfully grants access to user profile", async () => {
    const mockIdToken = oauthService.mintMockGoogleIdToken({
      email: "refresh_access@example.com",
    });
    const loginRes = await oauthService.handleGoogleLogin(mockIdToken, true);
    const refreshed = await oauthService.handleRefresh(loginRes.result.tokens.refreshToken);

    const profile = await oauthService.handleGetProfile(refreshed.accessToken);
    assert(!!profile, "Profile must be accessible via refreshed accessToken");
    assertEqual(profile.email, "refresh_access@example.com");
  });

  suite.test("T1.07.5: Expired or unrecognized refresh token throws Invalid refresh token", async () => {
    let errorCaught = false;
    try {
      await oauthService.handleRefresh("expired_or_forged_refresh_token");
    } catch (err) {
      errorCaught = true;
      assertEqual(err.message, "Invalid refresh token");
    }
    assert(errorCaught, "Must reject invalid refresh token");
  });

  return suite.run();
}
