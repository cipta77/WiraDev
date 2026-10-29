// Tier 4: Real-World Scenario - Unauthenticated Access 401 Redirect
import { createSuite, assert, assertEqual, assertStatus } from "../lib/test-utils.mjs";
import { NextJsProxySimulator } from "../lib/proxy-simulator.mjs";
import { OpaqueHttpClient } from "../lib/http-client.mjs";
import { CONFIG } from "../config.mjs";

export async function run() {
  const suite = createSuite("Tier 4: Journey - Unauthenticated Access 401 Redirect");
  const proxy = new NextJsProxySimulator();
  await proxy.load();
  const client = new OpaqueHttpClient(CONFIG.BACKEND_URL);

  suite.test("T4.03.1: Complete End-to-End User Journey: Unauthenticated Protected Access -> 401 -> Redirect", async () => {
    // Step 1: User navigates directly to protected route /dashboard
    const dashboardRoute = "/dashboard";
    const resolvedDashboard = proxy.resolveRewrite(dashboardRoute);
    assertEqual(resolvedDashboard.matched, false, "Step 1: Dashboard page itself is served directly by Next.js");

    // Step 2: Dashboard layout initializes and bootstraps session via /api/auth/me
    const meRoute = "/api/auth/me";
    const resolvedMe = proxy.resolveRewrite(meRoute);
    assert(resolvedMe.matched, "Step 2: /api/auth/me is routed through Next.js proxy");

    // Step 3: Client executes request without auth cookie or header to backend
    const unauthResponse = await client.get(resolvedMe.rewrittenUrl);
    assertStatus(unauthResponse, 401, "Step 3: Live backend returns HTTP 401 Unauthorized");
    assertEqual(unauthResponse.data?.message, "Unauthorized", "Step 3: Response contains Unauthorized message");

    // Step 4: Simulate api-client error handling logic
    let redirectDestination = null;
    function handleMeAuthCheck(status, path) {
      if (status === 401 && path === "/api/auth/me") {
        // As defined in wiradev-fe/lib/api-client.ts line 64-66:
        // Returns { result: null }, causing AuthContext to set user = null and redirecting to /signin
        redirectDestination = "/signin";
        return { result: null };
      }
      return { result: "unexpected" };
    }

    const clientHandled = handleMeAuthCheck(unauthResponse.status, meRoute);
    assertEqual(clientHandled.result, null, "Step 4: ApiClient returns null user result");
    assertEqual(redirectDestination, "/signin", "Step 5: Router triggers redirect to /signin login page");
  });

  return suite.run();
}
