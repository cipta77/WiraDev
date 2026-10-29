// Tier 1: Feature Coverage - Google Auth Endpoint Validation
import { createSuite, assert, assertEqual, assertStatus } from "../lib/test-utils.mjs";
import { OpaqueHttpClient } from "../lib/http-client.mjs";
import { HeadlessOAuthService } from "../lib/oauth-mock-service.mjs";
import { CONFIG } from "../config.mjs";

export async function run() {
  const suite = createSuite("Tier 1: Google Auth Endpoint Validation");
  const client = new OpaqueHttpClient(CONFIG.BACKEND_URL);
  const oauthService = new HeadlessOAuthService();

  suite.test("T1.04.1: POST /api/auth/google without body responds with 400 and validation error", async () => {
    const res = await client.post("/api/auth/google", {});
    assertStatus(res, 400, "Should reject empty payload");
    assertEqual(res.data?.message, "idToken is required", "Error message contract mismatch");
  });

  suite.test("T1.04.2: POST /api/auth/google with invalid idToken responds with 400", async () => {
    const res = await client.post("/api/auth/google", { idToken: "invalid_jwt_token_sample" });
    assertStatus(res, 400, "Should reject invalid JWT");
    assertEqual(res.data?.message, "Invalid Google token", "Must reject untrusted Google token");
  });

  suite.test("T1.04.3: Headless OAuth engine verifies Google token and creates new user on isSignUp=true", async () => {
    const mockIdToken = oauthService.mintMockGoogleIdToken({
      email: "new_google_student@university.edu",
      given_name: "Budi",
      family_name: "Santoso",
    });

    const response = await oauthService.handleGoogleLogin(mockIdToken, true);
    assert(!!response.result.user, "Must return user profile");
    assertEqual(response.result.user.email, "new_google_student@university.edu");
    assertEqual(response.result.user.first_name, "Budi");
    assertEqual(response.result.user.onboarding_completed, false);
  });

  suite.test("T1.04.4: Google Auth response structure omits sensitive password_hash", async () => {
    const mockIdToken = oauthService.mintMockGoogleIdToken({
      email: "sanitized_test@example.com",
    });
    const response = await oauthService.handleGoogleLogin(mockIdToken, true);
    assertEqual(response.result.user.password_hash, undefined, "password_hash must never be leaked");
  });

  suite.test("T1.04.5: Google Auth response issues valid accessToken and refreshToken pairs", async () => {
    const mockIdToken = oauthService.mintMockGoogleIdToken({
      email: "tokens_test@example.com",
    });
    const response = await oauthService.handleGoogleLogin(mockIdToken, true);
    const { accessToken, refreshToken } = response.result.tokens;
    assert(typeof accessToken === "string" && accessToken.length > 20, "Must issue valid accessToken");
    assert(typeof refreshToken === "string" && refreshToken.length > 20, "Must issue valid refreshToken");
  });

  suite.test("T1.04.6: Google login for non-existent account without isSignUp=true throws Account not found", async () => {
    const mockIdToken = oauthService.mintMockGoogleIdToken({
      email: "unregistered_visitor@example.com",
    });
    let errorCaught = false;
    try {
      await oauthService.handleGoogleLogin(mockIdToken, false);
    } catch (err) {
      errorCaught = true;
      assertEqual(err.message, "Account not found. Please register first.");
    }
    assert(errorCaught, "Should reject unregistered user when isSignUp is false");
  });

  return suite.run();
}
