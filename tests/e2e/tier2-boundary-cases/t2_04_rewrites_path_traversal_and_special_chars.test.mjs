// Tier 2: Boundary & Corner Cases - Rewrites Path Traversal & Special Characters
import { createSuite, assert, assertEqual } from "../lib/test-utils.mjs";
import { NextJsProxySimulator } from "../lib/proxy-simulator.mjs";
import { CONFIG } from "../config.mjs";

export async function run() {
  const suite = createSuite("Tier 2: Boundary - Rewrites Path Traversal & Special Characters");
  const proxy = new NextJsProxySimulator();
  await proxy.load();

  suite.test("T2.04.1: Query parameters are retained across reverse proxy resolution", async () => {
    const queryPath = "/api/v1/jobs?role=engineer&location=Jakarta&remote=true";
    const resolved = proxy.resolveRewrite(queryPath);
    assert(resolved.matched, "Route with query parameters must match rewrite rule");
    assertEqual(
      resolved.rewrittenUrl,
      `${CONFIG.BACKEND_URL}/api/v1/jobs?role=engineer&location=Jakarta&remote=true`,
      "All query parameters must be faithfully preserved"
    );
  });

  suite.test("T2.04.2: URL encoded characters in path segments forward without double-decoding errors", async () => {
    const encodedPath = "/api/users/search?q=full%20stack%26react";
    const resolved = proxy.resolveRewrite(encodedPath);
    assert(resolved.matched);
    assertEqual(
      resolved.rewrittenUrl,
      `${CONFIG.BACKEND_URL}/api/users/search?q=full%20stack%26react`
    );
  });

  suite.test("T2.04.3: Deeply nested paths forward properly through wildcard :path*", async () => {
    const deepPath = "/api/users/123/onboarding/profile/skills/assessment/results";
    const resolved = proxy.resolveRewrite(deepPath);
    assert(resolved.matched);
    assertEqual(
      resolved.rewrittenUrl,
      `${CONFIG.BACKEND_URL}/api/users/123/onboarding/profile/skills/assessment/results`
    );
  });

  suite.test("T2.04.4: Rewrites handle exact root prefix /api/ safely", async () => {
    const rootApiPath = "/api/";
    const resolved = proxy.resolveRewrite(rootApiPath);
    assert(resolved.matched);
    assertEqual(resolved.rewrittenUrl, `${CONFIG.BACKEND_URL}/api/`);
  });

  suite.test("T2.04.5: Uploads wildcard preserves filenames with spaces and underscores", async () => {
    const uploadsPath = "/uploads/transcripts/My_Official_Transcript%202026.pdf";
    const resolved = proxy.resolveRewrite(uploadsPath);
    assert(resolved.matched);
    assertEqual(
      resolved.rewrittenUrl,
      `${CONFIG.BACKEND_URL}/uploads/transcripts/My_Official_Transcript%202026.pdf`
    );
  });

  return suite.run();
}
