#!/usr/bin/env node
// =========================================================================
// WiraDev Comprehensive 4-Tier E2E Test Suite Runner
// =========================================================================

import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tier 1 Suites
import { run as runT1_01 } from "./tier1-feature-coverage/t1_01_nextjs_rewrites.test.mjs";
import { run as runT1_02 } from "./tier1-feature-coverage/t1_02_coop_headers.test.mjs";
import { run as runT1_03 } from "./tier1-feature-coverage/t1_03_cors_origin_whitelist.test.mjs";
import { run as runT1_04 } from "./tier1-feature-coverage/t1_04_google_auth_endpoint.test.mjs";
import { run as runT1_05 } from "./tier1-feature-coverage/t1_05_github_auth_endpoint.test.mjs";
import { run as runT1_06 } from "./tier1-feature-coverage/t1_06_session_verification_me.test.mjs";
import { run as runT1_07 } from "./tier1-feature-coverage/t1_07_token_refresh_lifecycle.test.mjs";
import { run as runT1_08 } from "./tier1-feature-coverage/t1_08_logout_cookie_clearing.test.mjs";
import { run as runT1_09 } from "./tier1-feature-coverage/t1_09_dual_mode_bearer_tokens.test.mjs";
import { run as runT1_10 } from "./tier1-feature-coverage/t1_10_vercel_env_configs.test.mjs";
import { run as runT1_11 } from "./tier1-feature-coverage/t1_11_health_and_service_status.test.mjs";

// Tier 2 Suites
import { run as runT2_01 } from "./tier2-boundary-cases/t2_01_malformed_tokens_and_payloads.test.mjs";
import { run as runT2_02 } from "./tier2-boundary-cases/t2_02_cors_unauthorized_origins_and_methods.test.mjs";
import { run as runT2_03 } from "./tier2-boundary-cases/t2_03_cookie_expiration_and_tampering.test.mjs";
import { run as runT2_04 } from "./tier2-boundary-cases/t2_04_rewrites_path_traversal_and_special_chars.test.mjs";
import { run as runT2_05 } from "./tier2-boundary-cases/t2_05_network_retry_and_timeout_boundaries.test.mjs";

// Tier 3 Suites
import { run as runT3_01 } from "./tier3-cross-feature/t3_01_auth_plus_proxy_plus_cookies.test.mjs";
import { run as runT3_02 } from "./tier3-cross-feature/t3_02_cors_preflight_plus_bearer_auth.test.mjs";
import { run as runT3_03 } from "./tier3-cross-feature/t3_03_token_refresh_during_proxy_me_check.test.mjs";
import { run as runT3_04 } from "./tier3-cross-feature/t3_04_multi_provider_session_isolation.test.mjs";

// Tier 4 Suites
import { run as runT4_01 } from "./tier4-real-world-scenarios/t4_01_google_signin_to_protected_dashboard.test.mjs";
import { run as runT4_02 } from "./tier4-real-world-scenarios/t4_02_github_oauth_code_exchange_flow.test.mjs";
import { run as runT4_03 } from "./tier4-real-world-scenarios/t4_03_unauthenticated_access_401_redirect.test.mjs";
import { run as runT4_04 } from "./tier4-real-world-scenarios/t4_04_transparent_token_refresh_cycle.test.mjs";
import { run as runT4_05 } from "./tier4-real-world-scenarios/t4_05_explicit_logout_session_cleanup.test.mjs";

const REGISTRY = [
  // Tier 1
  { tier: 1, id: "t1_01", name: "Next.js API & Uploads Rewrites", runner: runT1_01 },
  { tier: 1, id: "t1_02", name: "Next.js COOP Headers for Google Sign-In", runner: runT1_02 },
  { tier: 1, id: "t1_03", name: "Backend CORS & Dynamic Origin Whitelist", runner: runT1_03 },
  { tier: 1, id: "t1_04", name: "Google Auth Endpoint Validation", runner: runT1_04 },
  { tier: 1, id: "t1_05", name: "GitHub Auth Endpoint Validation", runner: runT1_05 },
  { tier: 1, id: "t1_06", name: "Session Verification (/api/auth/me)", runner: runT1_06 },
  { tier: 1, id: "t1_07", name: "Token Refresh Lifecycle", runner: runT1_07 },
  { tier: 1, id: "t1_08", name: "Logout & Cookie Invalidation", runner: runT1_08 },
  { tier: 1, id: "t1_09", name: "Dual-Mode Bearer Token Transport", runner: runT1_09 },
  { tier: 1, id: "t1_10", name: "Vercel Deployment & Environment Configs", runner: runT1_10 },
  { tier: 1, id: "t1_11", name: "Health & Service Status Check", runner: runT1_11 },

  // Tier 2
  { tier: 2, id: "t2_01", name: "Malformed Tokens & Payloads", runner: runT2_01 },
  { tier: 2, id: "t2_02", name: "CORS Unauthorized Origins & Methods", runner: runT2_02 },
  { tier: 2, id: "t2_03", name: "Cookie Expiration & Tampering", runner: runT2_03 },
  { tier: 2, id: "t2_04", name: "Rewrites Path Traversal & Special Chars", runner: runT2_04 },
  { tier: 2, id: "t2_05", name: "Network Retries & Timeout Boundaries", runner: runT2_05 },

  // Tier 3
  { tier: 3, id: "t3_01", name: "Auth + Next.js Proxy + Session Cookies", runner: runT3_01 },
  { tier: 3, id: "t3_02", name: "CORS Preflight + Bearer Token Auth", runner: runT3_02 },
  { tier: 3, id: "t3_03", name: "Token Refresh During Proxy /me Check", runner: runT3_03 },
  { tier: 3, id: "t3_04", name: "Multi-Provider Session Isolation", runner: runT3_04 },

  // Tier 4
  { tier: 4, id: "t4_01", name: "Google Sign-In to Protected Dashboard", runner: runT4_01 },
  { tier: 4, id: "t4_02", name: "GitHub OAuth Callback Flow", runner: runT4_02 },
  { tier: 4, id: "t4_03", name: "Unauthenticated Access 401 Redirect", runner: runT4_03 },
  { tier: 4, id: "t4_04", name: "Transparent Token Refresh Cycle", runner: runT4_04 },
  { tier: 4, id: "t4_05", name: "Explicit Logout Session Cleanup", runner: runT4_05 },
];

async function main() {
  const args = process.argv.slice(2);
  const tierFilter = args.find((a) => a.startsWith("--tier="))?.split("=")[1];
  const fileFilter = args.find((a) => a.startsWith("--file="))?.split("=")[1];
  const isVerbose = args.includes("--verbose");

  console.log("\n\x1b[1m\x1b[35m=========================================================================\x1b[0m");
  console.log("\x1b[1m\x1b[35m   WIRADEV OPAQUE-BOX END-TO-END (E2E) TEST SUITE RUNNER                \x1b[0m");
  console.log("\x1b[1m\x1b[35m=========================================================================\x1b[0m");
  console.log(`Node Runtime: ${process.version}`);
  console.log(`Working Directory: ${process.cwd()}`);
  if (tierFilter) console.log(`Tier Filter: Tier ${tierFilter}`);
  if (fileFilter) console.log(`File Filter: ${fileFilter}`);

  const startTime = Date.now();
  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  const tierStats = {
    1: { total: 0, passed: 0, failed: 0 },
    2: { total: 0, passed: 0, failed: 0 },
    3: { total: 0, passed: 0, failed: 0 },
    4: { total: 0, passed: 0, failed: 0 },
  };

  for (const entry of REGISTRY) {
    if (tierFilter && String(entry.tier) !== String(tierFilter)) continue;
    if (fileFilter && !entry.id.includes(fileFilter)) continue;

    try {
      const result = await entry.runner({ verbose: isVerbose });
      totalTests += result.total;
      totalPassed += result.passed;
      totalFailed += result.failed;

      tierStats[entry.tier].total += result.total;
      tierStats[entry.tier].passed += result.passed;
      tierStats[entry.tier].failed += result.failed;
    } catch (err) {
      console.error(`\x1b[31mFatal error executing suite ${entry.id}:\x1b[0m`, err);
      totalFailed++;
      tierStats[entry.tier].failed++;
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log("\n\x1b[1m\x1b[35m=========================================================================\x1b[0m");
  console.log("\x1b[1m\x1b[35m   E2E EXECUTION SUMMARY & TIER BREAKDOWN                                \x1b[0m");
  console.log("\x1b[1m\x1b[35m=========================================================================\x1b[0m");
  console.log(`  Tier 1 (Feature Coverage):            \x1b[32m${tierStats[1].passed} passed\x1b[0m / ${tierStats[1].total} total`);
  console.log(`  Tier 2 (Boundary & Corner Cases):     \x1b[32m${tierStats[2].passed} passed\x1b[0m / ${tierStats[2].total} total`);
  console.log(`  Tier 3 (Cross-Feature Combinations):  \x1b[32m${tierStats[3].passed} passed\x1b[0m / ${tierStats[3].total} total`);
  console.log(`  Tier 4 (Real-World User Journeys):    \x1b[32m${tierStats[4].passed} passed\x1b[0m / ${tierStats[4].total} total`);
  console.log("-------------------------------------------------------------------------");
  console.log(`  \x1b[1mGRAND TOTAL:\x1b[0m \x1b[32m${totalPassed} Passed\x1b[0m | \x1b[${totalFailed > 0 ? "31" : "32"}m${totalFailed} Failed\x1b[0m | Total: ${totalTests} assertions`);
  console.log(`  Total Duration: ${durationSec}s`);
  console.log("\x1b[1m\x1b[35m=========================================================================\x1b[0m\n");

  if (totalFailed > 0) {
    console.error(`\x1b[31mE2E Test Suite FAILED with ${totalFailed} errors.\x1b[0m\n`);
    process.exit(1);
  } else {
    console.log(`\x1b[32m✔ ALL E2E TESTS PASSED (100% SUCCESS RATE).\x1b[0m\n`);
    process.exit(0);
  }
}

main().catch((e) => {
  console.error("Unhandled top-level error in test runner:", e);
  process.exit(1);
});
