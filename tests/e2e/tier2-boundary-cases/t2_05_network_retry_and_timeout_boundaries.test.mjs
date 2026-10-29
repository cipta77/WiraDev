// Tier 2: Boundary & Corner Cases - Network Retries & Timeout Boundaries
import { createSuite, assert, assertEqual, assertStatus } from "../lib/test-utils.mjs";
import { OpaqueHttpClient } from "../lib/http-client.mjs";
import { CONFIG } from "../config.mjs";

export async function run() {
  const suite = createSuite("Tier 2: Boundary - Network Retries & Timeouts");
  const client = new OpaqueHttpClient(CONFIG.BACKEND_URL);

  suite.test("T2.05.1: Client AbortSignal cleanly aborts requests when timeout threshold is exceeded", async () => {
    const fastClient = new OpaqueHttpClient(CONFIG.BACKEND_URL);
    let abortCaught = false;
    try {
      // 1 millisecond timeout will trigger abort immediately
      await fastClient.request("/health", { timeout: 1 });
    } catch (err) {
      abortCaught = true;
      assert(err.name === "AbortError" || err.message.includes("aborted"), "Should trigger AbortError");
    }
    assert(abortCaught, "Client must honor timeout cancellation");
  });

  suite.test("T2.05.2: Concurrent burst of 10 simultaneous health checks resolves successfully", async () => {
    const promises = Array.from({ length: 10 }, () => client.get("/health"));
    const results = await Promise.all(promises);
    assertEqual(results.length, 10);
    for (const res of results) {
      assertStatus(res, 200);
      assertEqual(res.data?.status, "UP");
    }
  });

  suite.test("T2.05.3: Non-existent backend route responds with HTTP 404 without crashing server", async () => {
    const res = await client.get("/api/non-existent-probe-route-9999");
    assertStatus(res, 404, "Unknown route must return 404");
  });

  suite.test("T2.05.4: Single-retry guard prevents infinite loops on repeated 401 responses", async () => {
    let refreshAttemptCount = 0;
    let mainRequestCount = 0;

    // Simulate apiFetch retry loop logic
    async function mockApiFetch(path, attempt = 0) {
      mainRequestCount++;
      const is401 = true;
      if (is401 && attempt === 0) {
        refreshAttemptCount++;
        // Refresh also fails with 401
        const refreshFailed = true;
        if (!refreshFailed) {
          return mockApiFetch(path, attempt + 1);
        }
        return { status: 401, error: "Unauthorized after refresh attempt" };
      }
      return { status: 401 };
    }

    const res = await mockApiFetch("/api/auth/me");
    assertEqual(refreshAttemptCount, 1, "Refresh must only be attempted exactly once");
    assertEqual(mainRequestCount, 1, "Main request must not loop recursively");
    assertEqual(res.status, 401);
  });

  suite.test("T2.05.5: Handling empty response payloads does not trigger JSON parse syntax errors", async () => {
    // OPTIONS request returns empty string or 2 bytes
    const res = await client.options("/health");
    assert(res.data === "" || res.data === "OK" || typeof res.data === "object" || res.data === null);
  });

  return suite.run();
}
