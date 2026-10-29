// Tier 4: Real-World Scenario - Google Login to Protected Dashboard
import { createSuite, assert, assertEqual, assertStatus } from "../lib/test-utils.mjs";
import { NextJsProxySimulator } from "../lib/proxy-simulator.mjs";
import { HeadlessOAuthService } from "../lib/oauth-mock-service.mjs";

export async function run() {
  const suite = createSuite("Tier 4: Journey - Google Sign-In to Protected Dashboard");
  const proxy = new NextJsProxySimulator();
  await proxy.load();
  const oauthService = new HeadlessOAuthService();

  suite.test("T4.01.1: Complete End-to-End User Journey: Google OAuth -> Dashboard Hydration", async () => {
    // Step 1: User navigates to /google-login
    const loginPageHeaders = proxy.resolveHeaders("/google-login");
    const coopHeader = loginPageHeaders.find((h) => h.key === "Cross-Origin-Opener-Policy");
    assert(!!coopHeader, "Step 1: Must provide COOP header to permit Google popup messaging");
    assertEqual(coopHeader.value, "same-origin-allow-popups");

    // Step 2: Google Identity Services popup returns signed ID token
    const mockIdToken = oauthService.mintMockGoogleIdToken({
      email: "competition_participant@wiradev.id",
      given_name: "Ahmad",
      family_name: "Dahlan",
    });
    assert(typeof mockIdToken === "string" && mockIdToken.length > 50, "Step 2: GIS returns valid ID token");

    // Step 3: Frontend calls /api/auth/google through Next.js proxy
    const proxyAuthResolution = proxy.resolveRewrite("/api/auth/google");
    assert(proxyAuthResolution.matched, "Step 3: /api/auth/google must be rewritten through proxy");

    // Step 4: Backend exchanges ID token, links user, and generates session
    const authResult = await oauthService.handleGoogleLogin(mockIdToken, true);
    assert(!!authResult.result.tokens, "Step 4: Must return session tokens");
    const { accessToken, refreshToken } = authResult.result.tokens;

    // Step 5: Frontend bootstraps /dashboard by requesting /api/auth/me through proxy
    const proxyMeResolution = proxy.resolveRewrite("/api/auth/me");
    assert(proxyMeResolution.matched, "Step 5: /api/auth/me must be rewritten through proxy");

    // Step 6: Backend validates session and returns user profile
    const profile = await oauthService.handleGetProfile(accessToken);
    assert(!!profile, "Step 6: User profile successfully fetched for dashboard");
    assertEqual(profile.email, "competition_participant@wiradev.id");
    assertEqual(profile.first_name, "Ahmad");
    assertEqual(profile.providers[0], "google");
  });

  return suite.run();
}
