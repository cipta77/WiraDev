// Tier 4: Real-World Scenario - Transparent Token Refresh Cycle
import { createSuite, assert, assertEqual } from "../lib/test-utils.mjs";
import { HeadlessOAuthService } from "../lib/oauth-mock-service.mjs";

export async function run() {
  const suite = createSuite("Tier 4: Journey - Transparent Token Refresh Cycle");
  const oauthService = new HeadlessOAuthService();

  suite.test("T4.04.1: Complete End-to-End User Journey: Expired Session -> Automatic Refresh -> Re-fetch", async () => {
    // Step 1: User logs in and establishes session
    const mockIdToken = oauthService.mintMockGoogleIdToken({
      email: "continuous_session@example.com",
      given_name: "Lestari",
    });
    const loginRes = await oauthService.handleGoogleLogin(mockIdToken, true);
    let currentAccessToken = loginRes.result.tokens.accessToken;
    let currentRefreshToken = loginRes.result.tokens.refreshToken;

    // Step 2: User works for 15 minutes, access token expires
    currentAccessToken = "expired_token_signature";

    // Step 3: Next dashboard API call fails with 401
    const failedCheck = await oauthService.handleGetProfile(currentAccessToken);
    assertEqual(failedCheck, null, "Step 3: Stale access token fails verification");

    // Step 4: api-client.ts transparently intercepts 401 and calls /api/auth/refresh
    const refreshRes = await oauthService.handleRefresh(currentRefreshToken);
    assert(!!refreshRes.accessToken, "Step 4: New accessToken obtained transparently");
    currentAccessToken = refreshRes.accessToken;
    currentRefreshToken = refreshRes.refreshToken;

    // Step 5: api-client.ts automatically replays original request with refreshed token
    const successfulProfile = await oauthService.handleGetProfile(currentAccessToken);
    assert(!!successfulProfile, "Step 5: Profile fetched successfully on retry");
    assertEqual(successfulProfile.email, "continuous_session@example.com");
    assertEqual(successfulProfile.first_name, "Lestari");
  });

  return suite.run();
}
