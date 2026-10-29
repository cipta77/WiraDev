// Tier 3: Cross-Feature - Multi-Provider Session Isolation
import { createSuite, assert, assertEqual } from "../lib/test-utils.mjs";
import { HeadlessOAuthService } from "../lib/oauth-mock-service.mjs";

export async function run() {
  const suite = createSuite("Tier 3: Pairwise - Multi-Provider Session Isolation");
  const oauthService = new HeadlessOAuthService();

  suite.test("T3.04.1: Google and GitHub sessions maintain independent identities and user records", async () => {
    // 1. Google sign-in
    const googleIdToken = oauthService.mintMockGoogleIdToken({
      email: "alice@google.com",
      given_name: "Alice",
    });
    const googleLogin = await oauthService.handleGoogleLogin(googleIdToken, true);

    // 2. GitHub sign-in
    const { profile: githubProfile } = oauthService.mintMockGithubCode({
      login: "bob-dev",
      email: "bob@github.com",
      name: "Bob Dev",
    });
    const githubLogin = await oauthService.handleGithubLogin(githubProfile, true);

    assert(googleLogin.result.user.id !== githubLogin.result.user.id, "User IDs must be distinct");
    assertEqual(googleLogin.result.user.email, "alice@google.com");
    assertEqual(githubLogin.result.user.email, "bob@github.com");
  });

  suite.test("T3.04.2: Cryptographic token validation prevents cross-session privilege leakage", async () => {
    const googleToken = oauthService.mintMockGoogleIdToken({ email: "user_a@test.com" });
    const userALogin = await oauthService.handleGoogleLogin(googleToken, true);

    const githubProfile = oauthService.mintMockGithubCode({ login: "user_b", email: "user_b@test.com" });
    const userBLogin = await oauthService.handleGithubLogin(githubProfile.profile, true);

    const profileA = await oauthService.handleGetProfile(userALogin.result.tokens.accessToken);
    const profileB = await oauthService.handleGetProfile(userBLogin.result.tokens.accessToken);

    assertEqual(profileA.email, "user_a@test.com");
    assertEqual(profileB.email, "user_b@test.com");
  });

  suite.test("T3.04.3: Logging out one provider session does not impact other active sessions", async () => {
    const tokenA = oauthService.mintMockGoogleIdToken({ email: "isolation_a@test.com" });
    const resA = await oauthService.handleGoogleLogin(tokenA, true);

    const tokenB = oauthService.mintMockGoogleIdToken({ email: "isolation_b@test.com" });
    const resB = await oauthService.handleGoogleLogin(tokenB, true);

    // Logout session A
    oauthService.handleLogout(resA.result.tokens.refreshToken);

    // Session B profile and refresh remains healthy
    const profileB = await oauthService.handleGetProfile(resB.result.tokens.accessToken);
    assert(!!profileB, "Session B must remain fully authenticated after Session A logout");
    assertEqual(profileB.email, "isolation_b@test.com");
  });

  return suite.run();
}
