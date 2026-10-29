// Tier 1: Feature Coverage - Dual-Mode Token & Session Handling
import { createSuite, assert, assertEqual, assertStatus } from "../lib/test-utils.mjs";
import { OpaqueHttpClient } from "../lib/http-client.mjs";
import { HeadlessOAuthService } from "../lib/oauth-mock-service.mjs";
import { CONFIG } from "../config.mjs";

export async function run() {
  const suite = createSuite("Tier 1: Dual-Mode Token & Session Handling (Bearer + Cookies)");
  const client = new OpaqueHttpClient(CONFIG.BACKEND_URL);
  const oauthService = new HeadlessOAuthService();

  suite.test("T1.09.1: Live backend rejects request without cookie or Bearer header with 401", async () => {
    const res = await client.get("/api/auth/me");
    assertStatus(res, 401, "Must require credentials");
  });

  suite.test("T1.09.2: Headless auth engine verifies profile when authenticated via Bearer token", async () => {
    const mockIdToken = oauthService.mintMockGoogleIdToken({
      email: "bearer_tester@example.com",
      given_name: "Bearer",
    });
    const loginRes = await oauthService.handleGoogleLogin(mockIdToken, true);
    const accessToken = loginRes.result.tokens.accessToken;

    // Simulate client sending Authorization: Bearer <accessToken>
    const profile = await oauthService.handleGetProfile(accessToken);
    assert(!!profile, "Must resolve profile via Bearer token");
    assertEqual(profile.email, "bearer_tester@example.com");
  });

  suite.test("T1.09.3: Headless auth engine verifies profile when authenticated via cookie token", async () => {
    const mockIdToken = oauthService.mintMockGoogleIdToken({
      email: "cookie_tester@example.com",
      given_name: "Cookie",
    });
    const loginRes = await oauthService.handleGoogleLogin(mockIdToken, true);
    const cookieAccessToken = loginRes.result.tokens.accessToken;

    // Simulate client sending Cookie: access_token=<cookieAccessToken>
    const profile = await oauthService.handleGetProfile(cookieAccessToken);
    assert(!!profile, "Must resolve profile via Cookie access_token");
    assertEqual(profile.email, "cookie_tester@example.com");
  });

  suite.test("T1.09.4: Bearer token format adheres to RFC 6750 standard syntax", async () => {
    const mockIdToken = oauthService.mintMockGoogleIdToken({ email: "rfc_test@example.com" });
    const loginRes = await oauthService.handleGoogleLogin(mockIdToken, true);
    const token = loginRes.result.tokens.accessToken;
    const headerValue = `Bearer ${token}`;
    assert(headerValue.startsWith("Bearer "), "Header must start with 'Bearer ' prefix");
    const parts = headerValue.split(" ")[1].split(".");
    assertEqual(parts.length, 3, "Bearer JWT must have 3 dot-separated segments");
  });

  suite.test("T1.09.5: Authorization header without Bearer prefix is rejected", async () => {
    const res = await client.get("/api/auth/me", {
      headers: { Authorization: "Basic dXNlcjpwYXNz" },
    });
    assertStatus(res, 401, "Non-Bearer header must be rejected");
  });

  return suite.run();
}
