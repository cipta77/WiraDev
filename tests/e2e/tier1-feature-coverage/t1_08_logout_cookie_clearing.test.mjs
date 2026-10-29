// Tier 1: Feature Coverage - Logout & Cookie Invalidation
import { createSuite, assert, assertEqual, assertIncludes, assertStatus } from "../lib/test-utils.mjs";
import { OpaqueHttpClient } from "../lib/http-client.mjs";
import { CONFIG } from "../config.mjs";

export async function run() {
  const suite = createSuite("Tier 1: Logout & Cookie Clearing");
  const client = new OpaqueHttpClient(CONFIG.BACKEND_URL);

  // Seed cookie jar to test clearing behavior
  client.cookieJar.setFromHeader("access_token=active_mock_token; Path=/");
  client.cookieJar.setFromHeader("refresh_token=active_mock_refresh; Path=/");

  suite.test("T1.08.1: POST /api/auth/logout responds with HTTP 200 OK", async () => {
    const res = await client.post("/api/auth/logout", {});
    assertStatus(res, 200, "Logout must return 200 OK");
    assertEqual(res.data?.message, "Successfully logged out");
  });

  suite.test("T1.08.2: Logout response sets access_token cookie expiration to 1970 GMT", async () => {
    const res = await client.post("/api/auth/logout", {});
    const rawSetCookies = typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [res.headers.get("set-cookie") || ""];
    
    const accessCookie = rawSetCookies.find((c) => c.includes("access_token="));
    assert(!!accessCookie, "Must set-cookie for access_token");
    assertIncludes(accessCookie, "Thu, 01 Jan 1970 00:00:00 GMT", "Must expire in 1970");
  });

  suite.test("T1.08.3: Logout response sets refresh_token cookie expiration to 1970 GMT", async () => {
    const res = await client.post("/api/auth/logout", {});
    const rawSetCookies = typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [res.headers.get("set-cookie") || ""];
    
    const refreshCookie = rawSetCookies.find((c) => c.includes("refresh_token="));
    assert(!!refreshCookie, "Must set-cookie for refresh_token");
    assertIncludes(refreshCookie, "Thu, 01 Jan 1970 00:00:00 GMT", "Must expire in 1970");
  });

  suite.test("T1.08.4: CookieJar clears access_token from active storage following logout response", async () => {
    const testClient = new OpaqueHttpClient(CONFIG.BACKEND_URL);
    testClient.cookieJar.setFromHeader("access_token=sample; Path=/");
    assertEqual(testClient.cookieJar.has("access_token"), true);

    await testClient.post("/api/auth/logout", {});
    assertEqual(testClient.cookieJar.has("access_token"), false, "CookieJar must evict expired access_token");
  });

  suite.test("T1.08.5: CookieJar clears refresh_token from active storage following logout response", async () => {
    const testClient = new OpaqueHttpClient(CONFIG.BACKEND_URL);
    testClient.cookieJar.setFromHeader("refresh_token=sample; Path=/");
    assertEqual(testClient.cookieJar.has("refresh_token"), true);

    await testClient.post("/api/auth/logout", {});
    assertEqual(testClient.cookieJar.has("refresh_token"), false, "CookieJar must evict expired refresh_token");
  });

  return suite.run();
}
