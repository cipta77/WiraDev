// Tier 4: Real-World Scenario - Explicit Logout Session Cleanup
import { createSuite, assert, assertEqual, assertStatus } from "../lib/test-utils.mjs";
import { OpaqueHttpClient } from "../lib/http-client.mjs";
import { CONFIG } from "../config.mjs";

export async function run() {
  const suite = createSuite("Tier 4: Journey - Explicit Logout Session Cleanup");
  const client = new OpaqueHttpClient(CONFIG.BACKEND_URL);

  suite.test("T4.05.1: Complete End-to-End User Journey: User Logout -> Cookie Invalidation -> Session Nullified", async () => {
    // Step 1: Establish active session in client cookie jar
    client.cookieJar.setFromHeader("access_token=active_user_token_123; Path=/; HttpOnly");
    client.cookieJar.setFromHeader("refresh_token=active_refresh_token_456; Path=/; HttpOnly");
    assertEqual(client.cookieJar.has("access_token"), true, "Step 1: Session cookies present");

    // Step 2: User clicks logout in dashboard -> sends POST /api/auth/logout
    const logoutRes = await client.post("/api/auth/logout", {});
    assertStatus(logoutRes, 200, "Step 2: Logout returns 200 OK");
    assertEqual(logoutRes.data?.message, "Successfully logged out");

    // Step 3: Cookie jar processes expiration headers and evicts session cookies
    assertEqual(client.cookieJar.has("access_token"), false, "Step 3: access_token purged from cookie jar");
    assertEqual(client.cookieJar.has("refresh_token"), false, "Step 3: refresh_token purged from cookie jar");

    // Step 4: Subsequent request to /api/auth/me with purged cookies returns 401 Unauthorized
    const meRes = await client.get("/api/auth/me");
    assertStatus(meRes, 401, "Step 4: Subsequent /api/auth/me returns 401 Unauthorized");
    assertEqual(meRes.data?.message, "Unauthorized");
  });

  return suite.run();
}
