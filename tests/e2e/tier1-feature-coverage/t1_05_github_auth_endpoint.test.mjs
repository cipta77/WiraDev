// Tier 1: Feature Coverage - GitHub Auth Endpoint Validation
import { createSuite, assert, assertEqual, assertIncludes, assertStatus } from "../lib/test-utils.mjs";
import { OpaqueHttpClient } from "../lib/http-client.mjs";
import { HeadlessOAuthService } from "../lib/oauth-mock-service.mjs";
import { CONFIG } from "../config.mjs";

export async function run() {
  const suite = createSuite("Tier 1: GitHub Auth Endpoint Validation");
  const client = new OpaqueHttpClient(CONFIG.BACKEND_URL);
  const oauthService = new HeadlessOAuthService();

  suite.test("T1.05.1: POST /api/auth/github without body responds with 400 and code is required", async () => {
    const res = await client.post("/api/auth/github", {});
    assertStatus(res, 400, "Should reject empty payload");
    assertEqual(res.data?.message, "code is required", "Error message contract mismatch");
  });

  suite.test("T1.05.2: POST /api/auth/github with invalid code responds with GitHub OAuth error", async () => {
    const res = await client.post("/api/auth/github", { code: "invalid_temporary_oauth_code" });
    assertStatus(res, 400, "Should reject invalid GitHub authorization code");
    assertIncludes(
      res.data?.message || "",
      "GitHub OAuth error",
      "Must surface GitHub upstream code error"
    );
  });

  suite.test("T1.05.3: Headless OAuth engine registers new GitHub user with username and avatar on isSignUp=true", async () => {
    const { code, profile } = oauthService.mintMockGithubCode({
      login: "wiradev-octocat",
      email: "octocat@github.dev",
      name: "Octo Cat",
    });

    const response = await oauthService.handleGithubLogin(profile, true);
    assert(!!response.result.user, "Must return user profile");
    assertEqual(response.result.user.github_username, "wiradev-octocat");
    assertEqual(response.result.user.email, "octocat@github.dev");
    assertIncludes(response.result.user.providers, "github", "Providers list must include github");
  });

  suite.test("T1.05.4: GitHub OAuth exchange generates 15-minute access token and 7-day refresh token", async () => {
    const { profile } = oauthService.mintMockGithubCode({
      login: "dev-ninja",
      email: "ninja@example.com",
    });

    const response = await oauthService.handleGithubLogin(profile, true);
    const { accessToken, refreshToken } = response.result.tokens;
    assert(!!accessToken && !!refreshToken, "Tokens must be provided");
  });

  suite.test("T1.05.5: Non-registered GitHub user logging in with isSignUp=false triggers account not found", async () => {
    const { profile } = oauthService.mintMockGithubCode({
      login: "brand_new_user_999",
      email: "brand_new_999@example.com",
    });

    let errorCaught = false;
    try {
      await oauthService.handleGithubLogin(profile, false);
    } catch (err) {
      errorCaught = true;
      assertEqual(err.message, "Account not found. Please register first.");
    }
    assert(errorCaught, "Should reject unregistered user when isSignUp is false");
  });

  return suite.run();
}
