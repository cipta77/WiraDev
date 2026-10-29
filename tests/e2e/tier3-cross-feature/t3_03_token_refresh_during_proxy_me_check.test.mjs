// Tier 3: Cross-Feature - Transparent Token Refresh During /me Check
import { createSuite, assert, assertEqual } from "../lib/test-utils.mjs";
import { HeadlessOAuthService } from "../lib/oauth-mock-service.mjs";

export async function run() {
  const suite = createSuite("Tier 3: Pairwise - Token Refresh During Proxy /me Check");
  const oauthService = new HeadlessOAuthService();

  suite.test("T3.03.1: Expired access token triggers simulated client-side refresh workflow", async () => {
    // 1. Initial user login
    const mockIdToken = oauthService.mintMockGoogleIdToken({
      email: "refresh_cycle_user@example.com",
      given_name: "CycleUser",
    });
    const loginRes = await oauthService.handleGoogleLogin(mockIdToken, true);
    const { refreshToken } = loginRes.result.tokens;

    // 2. Simulate access token expiration
    const expiredAccessToken = "expired_token_simulated";
    const initialCheck = await oauthService.handleGetProfile(expiredAccessToken);
    assertEqual(initialCheck, null, "Expired token must return null profile (401)");

    // 3. Client intercepts 401 and executes refresh call
    const refreshRes = await oauthService.handleRefresh(refreshToken);
    assert(!!refreshRes.accessToken, "Refresh must issue new accessToken");

    // 4. Retried /me check succeeds with fresh accessToken
    const retriedProfile = await oauthService.handleGetProfile(refreshRes.accessToken);
    assert(!!retriedProfile, "Retried profile fetch must succeed");
    assertEqual(retriedProfile.email, "refresh_cycle_user@example.com");
  });

  suite.test("T3.03.2: Failed refresh triggers session termination and leaves profile null", async () => {
    const expiredRefreshToken = "corrupted_or_expired_refresh_token";
    let refreshFailed = false;
    try {
      await oauthService.handleRefresh(expiredRefreshToken);
    } catch {
      refreshFailed = true;
    }
    assert(refreshFailed, "Refresh must fail with invalid token");

    // Profile remains null
    const profile = await oauthService.handleGetProfile(null);
    assertEqual(profile, null);
  });

  return suite.run();
}
