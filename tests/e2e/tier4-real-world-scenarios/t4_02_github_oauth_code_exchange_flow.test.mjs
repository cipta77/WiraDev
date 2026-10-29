// Tier 4: Real-World Scenario - GitHub OAuth Authorization Code Exchange
import { createSuite, assert, assertEqual } from "../lib/test-utils.mjs";
import { NextJsProxySimulator } from "../lib/proxy-simulator.mjs";
import { HeadlessOAuthService } from "../lib/oauth-mock-service.mjs";

export async function run() {
  const suite = createSuite("Tier 4: Journey - GitHub OAuth Callback Exchange to Session Fetch");
  const proxy = new NextJsProxySimulator();
  await proxy.load();
  const oauthService = new HeadlessOAuthService();

  suite.test("T4.02.1: Complete End-to-End User Journey: GitHub OAuth -> Callback -> Session Fetch", async () => {
    // Step 1: Initiate OAuth parameters
    const origin = "https://wiradev-test.vercel.app";
    const redirectUri = `${origin}/oauth-callback`;
    const statePayload = JSON.stringify({ mode: "github_auth", isSignUp: true, redirect: "/dashboard" });
    const encodedState = Buffer.from(statePayload).toString("base64url");
    assert(encodedState.length > 10, "Step 1: State must be base64url encoded JSON");

    // Step 2: GitHub redirects back to /oauth-callback with authorization code and state
    const { code, profile } = oauthService.mintMockGithubCode({
      login: "innovative-coder",
      email: "innovative@wiraschool.ac.id",
      name: "Siti Rahma",
    });

    // Step 3: Callback page validates state and dispatches code to /api/auth/github
    const decodedState = JSON.parse(Buffer.from(encodedState, "base64url").toString("utf-8"));
    assertEqual(decodedState.mode, "github_auth", "Step 3: State mode must verify as github_auth");

    // Step 4: Route through Next.js proxy rewrites
    const resolvedAuth = proxy.resolveRewrite("/api/auth/github");
    assert(resolvedAuth.matched, "Step 4: /api/auth/github must be rewritten through proxy");

    // Step 5: Backend exchanges authorization code for tokens
    const authResult = await oauthService.handleGithubLogin(profile, true);
    assert(!!authResult.result.tokens, "Step 5: Must issue access and refresh tokens");
    assertEqual(authResult.result.user.github_username, "innovative-coder");

    // Step 6: AuthContext verifies session via /api/auth/me
    const resolvedMe = proxy.resolveRewrite("/api/auth/me");
    assert(resolvedMe.matched, "Step 6: /api/auth/me must route through proxy");

    const sessionUser = await oauthService.handleGetProfile(authResult.result.tokens.accessToken);
    assert(!!sessionUser, "Step 6: Session user profile must be established");
    assertEqual(sessionUser.email, "innovative@wiraschool.ac.id");
  });

  return suite.run();
}
