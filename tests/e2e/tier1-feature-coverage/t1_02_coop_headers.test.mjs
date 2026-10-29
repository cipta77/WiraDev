// Tier 1: Feature Coverage - COOP Headers for Google Sign-In
import { createSuite, assert, assertEqual } from "../lib/test-utils.mjs";
import { NextJsProxySimulator } from "../lib/proxy-simulator.mjs";

export async function run() {
  const suite = createSuite("Tier 1: Next.js COOP Headers for Google Sign-In");
  const proxy = new NextJsProxySimulator();
  await proxy.load();

  suite.test("T1.02.1: next.config.ts exports an async headers function", async () => {
    assert(typeof proxy.nextConfig.headers === "function", "headers must be a function");
  });

  suite.test("T1.02.2: headers array includes route configuration for /google-login", async () => {
    const headersList = proxy.getHeaders();
    const googleLoginRule = headersList.find((h) => h.source === "/google-login");
    assert(!!googleLoginRule, "Missing headers rule for /google-login");
  });

  suite.test("T1.02.3: /google-login configures Cross-Origin-Opener-Policy header key", async () => {
    const headersList = proxy.getHeaders();
    const rule = headersList.find((h) => h.source === "/google-login");
    const coopHeader = rule.headers.find(
      (h) => h.key.toLowerCase() === "cross-origin-opener-policy"
    );
    assert(!!coopHeader, "Missing Cross-Origin-Opener-Policy in header definitions");
  });

  suite.test("T1.02.4: Cross-Origin-Opener-Policy value equals same-origin-allow-popups", async () => {
    const headersList = proxy.getHeaders();
    const rule = headersList.find((h) => h.source === "/google-login");
    const coopHeader = rule.headers.find(
      (h) => h.key.toLowerCase() === "cross-origin-opener-policy"
    );
    assertEqual(
      coopHeader.value,
      "same-origin-allow-popups",
      "COOP header must allow popups for Google Identity Services"
    );
  });

  suite.test("T1.02.5: Header simulator resolves COOP header specifically for /google-login", async () => {
    const resolvedHeaders = proxy.resolveHeaders("/google-login");
    const hasCoop = resolvedHeaders.some(
      (h) => h.key === "Cross-Origin-Opener-Policy" && h.value === "same-origin-allow-popups"
    );
    assert(hasCoop, "Simulator must attach COOP to /google-login");
  });

  suite.test("T1.02.6: Other pages do not receive unmatched COOP headers unexpectedly", async () => {
    const resolvedHeaders = proxy.resolveHeaders("/signin");
    const hasCoop = resolvedHeaders.some((h) => h.key === "Cross-Origin-Opener-Policy");
    assertEqual(hasCoop, false, "/signin should not have custom /google-login COOP header");
  });

  return suite.run();
}
