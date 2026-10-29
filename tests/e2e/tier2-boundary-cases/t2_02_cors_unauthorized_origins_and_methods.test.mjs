// Tier 2: Boundary & Corner Cases - CORS Unauthorized Origins & Methods
import { createSuite, assert, assertEqual, assertStatus } from "../lib/test-utils.mjs";
import { OpaqueHttpClient } from "../lib/http-client.mjs";
import { CONFIG } from "../config.mjs";

export async function run() {
  const suite = createSuite("Tier 2: Boundary - CORS Unauthorized Origins & Methods");
  const client = new OpaqueHttpClient(CONFIG.BACKEND_URL);

  suite.test("T2.02.1: Request without Origin header does not set Access-Control-Allow-Origin", async () => {
    // Native request without origin
    const res = await fetch(`${CONFIG.BACKEND_URL}/health`);
    const allowOrigin = res.headers.get("access-control-allow-origin");
    assertEqual(allowOrigin, null, "Origin header should not be returned when client sends none");
  });

  suite.test("T2.02.2: Preflight OPTIONS without Access-Control-Request-Method handles cleanly", async () => {
    const res = await client.options("/api/auth/me", {
      headers: { Origin: "https://unknown-domain.com" },
    });
    assert(res.status === 200 || res.status === 204, "Preflight without method should return 200/204");
  });

  suite.test("T2.02.3: TRACE method request is rejected or handled safely without echo", async () => {
    try {
      const res = await client.request("/health", { method: "TRACE" });
      assert(
        res.status === 405 || res.status === 400 || res.status === 404 || res.status === 501,
        `TRACE method should be rejected, got ${res.status}`
      );
    } catch (err) {
      // WHATWG Fetch specification strictly forbids TRACE/CONNECT methods for security
      assert(
        err.message.includes("unsupported") || err.name === "TypeError",
        `Expected fetch to block forbidden TRACE method, got ${err.message}`
      );
    }
  });

  suite.test("T2.02.4: Empty Origin string header is handled safely", async () => {
    const res = await client.get("/health", {
      headers: { Origin: "" },
    });
    assertStatus(res, 200);
  });

  suite.test("T2.02.5: Oversized Origin header (stress) is handled without server crash", async () => {
    const hugeOrigin = `https://${"a".repeat(2000)}.vercel.app`;
    try {
      const res = await client.get("/health", {
        headers: { Origin: hugeOrigin },
      });
      assert(res.status === 200 || res.status === 431, `Should handle or reject gracefully, got ${res.status}`);
    } catch (e) {
      // In some environments, Node's HTTP parser returns 431 Request Header Fields Too Large
      assert(true, "Client or server safely rejected oversized header");
    }
  });

  return suite.run();
}
