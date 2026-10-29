// Tier 1: Feature Coverage - Next.js Rewrites Reverse Proxy
import { createSuite, assert, assertEqual, assertIncludes } from "../lib/test-utils.mjs";
import { NextJsProxySimulator } from "../lib/proxy-simulator.mjs";
import { CONFIG } from "../config.mjs";

export async function run() {
  const suite = createSuite("Tier 1: Next.js API & Uploads Rewrites (Proxy Forwarding)");
  const proxy = new NextJsProxySimulator();
  await proxy.load();

  suite.test("T1.01.1: next.config.ts exports an async rewrites function", async () => {
    assert(typeof proxy.nextConfig.rewrites === "function", "rewrites must be a function");
  });

  suite.test("T1.01.2: rewrites configuration defines source for /api/:path*", async () => {
    const rewrites = proxy.getRewrites();
    const apiRule = rewrites.find((r) => r.source === "/api/:path*");
    assert(!!apiRule, "Missing rewrite rule for source /api/:path*");
    assertIncludes(apiRule.destination, "/api/:path*", "Destination must forward :path*");
  });

  suite.test("T1.01.3: rewrites configuration defines source for /uploads/:path*", async () => {
    const rewrites = proxy.getRewrites();
    const uploadsRule = rewrites.find((r) => r.source === "/uploads/:path*");
    assert(!!uploadsRule, "Missing rewrite rule for source /uploads/:path*");
    assertIncludes(uploadsRule.destination, "/uploads/:path*", "Destination must forward uploads :path*");
  });

  suite.test("T1.01.4: /api/:path* destination points to wirakarsa backend host", async () => {
    const rewrites = proxy.getRewrites();
    const apiRule = rewrites.find((r) => r.source === "/api/:path*");
    assert(
      apiRule.destination.startsWith("https://wirakarsa.infinitelearningstudent.id") ||
      apiRule.destination.startsWith(CONFIG.BACKEND_URL),
      `Expected destination to target backend, got: ${apiRule?.destination}`
    );
  });

  suite.test("T1.01.5: Rewrites resolution accurately forwards nested API routes", async () => {
    const resolved = proxy.resolveRewrite("/api/auth/me");
    assert(resolved.matched, "Route /api/auth/me should match rewrite rule");
    assertEqual(
      resolved.rewrittenUrl,
      `${CONFIG.BACKEND_URL}/api/auth/me`,
      "Resolved URL should equal backend target URL"
    );
  });

  suite.test("T1.01.6: Rewrites resolution accurately forwards uploads routes", async () => {
    const resolved = proxy.resolveRewrite("/uploads/cv/screening/12345.pdf");
    assert(resolved.matched, "Route /uploads/cv/screening/12345.pdf should match rewrite rule");
    assertEqual(
      resolved.rewrittenUrl,
      `${CONFIG.BACKEND_URL}/uploads/cv/screening/12345.pdf`,
      "Resolved uploads URL should match backend destination"
    );
  });

  suite.test("T1.01.7: Unmatched frontend page routes are preserved without rewrite", async () => {
    const resolved = proxy.resolveRewrite("/dashboard/dev-hub");
    assertEqual(resolved.matched, false, "/dashboard/dev-hub should not be rewritten");
    assertEqual(resolved.rewrittenUrl, "/dashboard/dev-hub", "Route should stay unchanged");
  });

  return suite.run();
}
