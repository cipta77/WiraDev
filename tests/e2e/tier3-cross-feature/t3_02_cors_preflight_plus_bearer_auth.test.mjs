// Tier 3: Cross-Feature - CORS Preflight + Bearer Token Authorization
import { createSuite, assert, assertEqual, assertIncludes, assertStatus } from "../lib/test-utils.mjs";
import { OpaqueHttpClient } from "../lib/http-client.mjs";
import { CONFIG } from "../config.mjs";

export async function run() {
  const suite = createSuite("Tier 3: Pairwise - CORS Preflight + Bearer Token Authorization");
  const client = new OpaqueHttpClient(CONFIG.BACKEND_URL);

  suite.test("T3.02.1: OPTIONS preflight on /api/auth/me accepts Authorization header from Vercel origin", async () => {
    const res = await client.options("/api/auth/me", {
      headers: {
        Origin: CONFIG.VERCEL_ORIGIN,
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "Authorization, Content-Type",
      },
    });
    assertStatus(res, 200, "Preflight must return 200 OK");
    const allowedHeaders = res.headers.get("access-control-allow-headers") || "";
    assertIncludes(allowedHeaders, "Authorization", "Preflight must explicitly authorize Authorization header");
  });

  suite.test("T3.02.2: CORS preflight preserves credentials permission alongside Authorization header", async () => {
    const res = await client.options("/api/auth/me", {
      headers: {
        Origin: "https://wiradev-staging.vercel.app",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "Authorization",
      },
    });
    const allowCreds = res.headers.get("access-control-allow-credentials");
    assertEqual(allowCreds, "true");
    const allowOrigin = res.headers.get("access-control-allow-origin");
    assertEqual(allowOrigin, "https://wiradev-staging.vercel.app");
  });

  suite.test("T3.02.3: Actual GET request carrying Bearer header receives correct CORS response headers", async () => {
    const testOrigin = "https://wiradev-review.vercel.app";
    const res = await client.get("/api/auth/me", {
      headers: {
        Origin: testOrigin,
        Authorization: "Bearer dummy_test_token_cors",
      },
    });
    // Even if token is rejected (401), CORS headers must still be set so the browser doesn't block the response
    const allowOrigin = res.headers.get("access-control-allow-origin");
    assertEqual(allowOrigin, testOrigin, "CORS headers must be set even on 401 error response");
  });

  return suite.run();
}
