// Tier 1: Feature Coverage - Backend CORS & Dynamic Origin Whitelist
import { createSuite, assert, assertEqual, assertIncludes, assertStatus } from "../lib/test-utils.mjs";
import { OpaqueHttpClient } from "../lib/http-client.mjs";
import { CONFIG } from "../config.mjs";

export async function run() {
  const suite = createSuite("Tier 1: Backend CORS & Dynamic Origin Whitelist");
  const client = new OpaqueHttpClient(CONFIG.BACKEND_URL);

  suite.test("T1.03.1: Live backend reflects Vercel Origin in Access-Control-Allow-Origin", async () => {
    const testOrigin = "https://wiradev-prod.vercel.app";
    const res = await client.get("/health", {
      headers: { Origin: testOrigin },
    });
    const allowOrigin = res.headers.get("access-control-allow-origin");
    assertEqual(allowOrigin, testOrigin, "Origin must be dynamically reflected");
  });

  suite.test("T1.03.2: Live backend permits credentials with Access-Control-Allow-Credentials: true", async () => {
    const res = await client.get("/health", {
      headers: { Origin: CONFIG.VERCEL_ORIGIN },
    });
    const allowCreds = res.headers.get("access-control-allow-credentials");
    assertEqual(allowCreds, "true", "Credentials header must strictly equal 'true'");
  });

  suite.test("T1.03.3: Preflight OPTIONS request responds with HTTP 200 OK", async () => {
    const res = await client.options("/api/auth/google", {
      headers: {
        Origin: "https://my-preview-app.vercel.app",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type, Authorization",
      },
    });
    assertStatus(res, 200, "OPTIONS preflight must return 200 OK");
  });

  suite.test("T1.03.4: Preflight OPTIONS declares supported HTTP methods", async () => {
    const res = await client.options("/api/auth/login", {
      headers: {
        Origin: CONFIG.VERCEL_ORIGIN,
        "Access-Control-Request-Method": "POST",
      },
    });
    const methods = res.headers.get("access-control-allow-methods") || "";
    assertIncludes(methods, "POST", "Must allow POST");
    assertIncludes(methods, "GET", "Must allow GET");
    assertIncludes(methods, "OPTIONS", "Must allow OPTIONS");
  });

  suite.test("T1.03.5: Preflight OPTIONS declares Authorization and Content-Type in allowed headers", async () => {
    const res = await client.options("/api/auth/me", {
      headers: {
        Origin: CONFIG.VERCEL_ORIGIN,
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "Authorization, Content-Type",
      },
    });
    const headers = res.headers.get("access-control-allow-headers") || "";
    assertIncludes(headers, "Authorization", "Must allow Authorization header for Bearer tokens");
    assertIncludes(headers, "Content-Type", "Must allow Content-Type header for JSON");
  });

  suite.test("T1.03.6: Preflight correctly validates dynamic preview deployment origins", async () => {
    const previewOrigin = "https://wiradev-git-m1-vercel-cipta.vercel.app";
    const res = await client.options("/api/auth/github", {
      headers: {
        Origin: previewOrigin,
        "Access-Control-Request-Method": "POST",
      },
    });
    const allowOrigin = res.headers.get("access-control-allow-origin");
    assertEqual(allowOrigin, previewOrigin, "Preview Vercel origin must be reflected in preflight");
  });

  return suite.run();
}
