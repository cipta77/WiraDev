// Tier 2: Boundary & Corner Cases - Cookie Expiration & Tampering
import { createSuite, assert, assertEqual, assertStatus, verifyJwt, createJwt } from "../lib/test-utils.mjs";
import { CookieJar, OpaqueHttpClient } from "../lib/http-client.mjs";
import { HeadlessOAuthService } from "../lib/oauth-mock-service.mjs";
import { CONFIG } from "../config.mjs";

export async function run() {
  const suite = createSuite("Tier 2: Boundary - Cookie Expiration & Tampering");
  const oauthService = new HeadlessOAuthService();
  const client = new OpaqueHttpClient(CONFIG.BACKEND_URL);

  suite.test("T2.03.1: Expired JWT (exp in the past) fails signature verification", async () => {
    // Generate token that expired 10 minutes ago
    const expiredToken = createJwt({ sub: "expired_usr" }, CONFIG.JWT_ACCESS_SECRET, -600);
    const verified = verifyJwt(expiredToken, CONFIG.JWT_ACCESS_SECRET);
    assertEqual(verified, null, "Expired token must not verify");
  });

  suite.test("T2.03.2: Tampered payload claims invalidate JWT signature", async () => {
    const validToken = createJwt({ sub: "regular_user_123" }, CONFIG.JWT_ACCESS_SECRET, 900);
    const [header, payload, sig] = validToken.split(".");
    
    // Change sub to admin
    const tamperedPayload = Buffer.from(JSON.stringify({ sub: "admin_user_000", iat: 1, exp: 9999999999 })).toString("base64url");
    const forgedToken = `${header}.${tamperedPayload}.${sig}`;

    const verified = verifyJwt(forgedToken, CONFIG.JWT_ACCESS_SECRET);
    assertEqual(verified, null, "Tampered payload must fail cryptographic verification");
  });

  suite.test("T2.03.3: CookieJar correctly purges cookies marked with Max-Age=0", async () => {
    const jar = new CookieJar();
    jar.setFromHeader("access_token=active_value; Path=/; Max-Age=900");
    assertEqual(jar.has("access_token"), true);

    jar.setFromHeader("access_token=; Path=/; Max-Age=0");
    assertEqual(jar.has("access_token"), false, "Max-Age=0 must clear the cookie immediately");
  });

  suite.test("T2.03.4: CookieJar correctly purges cookies with past Expires date", async () => {
    const jar = new CookieJar();
    jar.setFromHeader("session_id=active_123; Path=/");
    assertEqual(jar.has("session_id"), true);

    jar.setFromHeader("session_id=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT");
    assertEqual(jar.has("session_id"), false, "1970 Expires must clear cookie");
  });

  suite.test("T2.03.5: Access token cannot be used interchangeably as a refresh token", async () => {
    const mockIdToken = oauthService.mintMockGoogleIdToken({ email: "swapped_token@example.com" });
    const loginRes = await oauthService.handleGoogleLogin(mockIdToken, true);
    const { accessToken } = loginRes.result.tokens;

    let caught = false;
    try {
      // Attempting to refresh using accessToken signed with accessSecret instead of refreshSecret
      await oauthService.handleRefresh(accessToken);
    } catch (e) {
      caught = true;
      assertEqual(e.message, "Invalid refresh token");
    }
    assert(caught, "Access token must fail refreshSecret verification");
  });

  suite.test("T2.03.6: Tampered access_token cookie sent to live backend returns 401", async () => {
    const testClient = new OpaqueHttpClient(CONFIG.BACKEND_URL);
    testClient.cookieJar.setFromHeader("access_token=tampered_content_123; Path=/");
    const res = await testClient.get("/api/auth/me");
    assertStatus(res, 401, "Tampered cookie must return 401");
  });

  return suite.run();
}
