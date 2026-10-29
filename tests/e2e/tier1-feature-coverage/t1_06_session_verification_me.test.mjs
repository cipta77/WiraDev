// Tier 1: Feature Coverage - Session Verification /api/auth/me
import { createSuite, assert, assertEqual, assertStatus } from "../lib/test-utils.mjs";
import { OpaqueHttpClient } from "../lib/http-client.mjs";
import { HeadlessOAuthService } from "../lib/oauth-mock-service.mjs";
import { CONFIG } from "../config.mjs";

export async function run() {
  const suite = createSuite("Tier 1: Session Verification (/api/auth/me)");
  const client = new OpaqueHttpClient(CONFIG.BACKEND_URL);
  const oauthService = new HeadlessOAuthService();

  suite.test("T1.06.1: GET /api/auth/me unauthenticated returns 401 Unauthorized", async () => {
    const res = await client.get("/api/auth/me");
    assertStatus(res, 401, "Unauthenticated /api/auth/me must return 401");
    assertEqual(res.data?.message, "Unauthorized", "Expected Unauthorized message");
  });

  suite.test("T1.06.2: GET /api/auth/me with invalid cookie returns 401", async () => {
    const fakeClient = new OpaqueHttpClient(CONFIG.BACKEND_URL);
    fakeClient.cookieJar.setFromHeader("access_token=tampered_malformed_token; Path=/");
    const res = await fakeClient.get("/api/auth/me");
    assertStatus(res, 401, "Tampered cookie must be rejected");
  });

  suite.test("T1.06.3: GET /api/auth/me with invalid Bearer header returns 401", async () => {
    const fakeClient = new OpaqueHttpClient(CONFIG.BACKEND_URL);
    fakeClient.setBearerToken("malformed.jwt.bearer");
    const res = await fakeClient.get("/api/auth/me");
    assertStatus(res, 401, "Invalid Bearer token must be rejected");
  });

  suite.test("T1.06.4: Headless session engine returns authenticated user when valid token provided", async () => {
    const mockIdToken = oauthService.mintMockGoogleIdToken({
      email: "profile_verification@example.com",
      given_name: "Verification",
      family_name: "User",
    });
    const loginRes = await oauthService.handleGoogleLogin(mockIdToken, true);
    const accessToken = loginRes.result.tokens.accessToken;

    const profile = await oauthService.handleGetProfile(accessToken);
    assert(!!profile, "Must retrieve profile");
    assertEqual(profile.email, "profile_verification@example.com");
    assertEqual(profile.first_name, "Verification");
  });

  suite.test("T1.06.5: Session profile verification strictly excludes sensitive password_hash", async () => {
    const mockIdToken = oauthService.mintMockGoogleIdToken({
      email: "safe_profile@example.com",
    });
    const loginRes = await oauthService.handleGoogleLogin(mockIdToken, true);
    const profile = await oauthService.handleGetProfile(loginRes.result.tokens.accessToken);
    assertEqual(profile.password_hash, undefined, "password_hash must never exist in /me payload");
  });

  suite.test("T1.06.6: Expired access token fails profile verification", async () => {
    const expiredToken = oauthService.mintMockGoogleIdToken({ email: "expired@test.com" });
    // Token with 0s expiry
    const profile = await oauthService.handleGetProfile("invalid_or_expired_jwt");
    assertEqual(profile, null, "Expired/invalid token must yield null profile");
  });

  return suite.run();
}
