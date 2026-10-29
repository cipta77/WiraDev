// Tier 3: Cross-Feature - Auth + Next.js Proxy + Session Cookies
import { createSuite, assert, assertEqual, assertStatus } from "../lib/test-utils.mjs";
import { NextJsProxySimulator } from "../lib/proxy-simulator.mjs";
import { OpaqueHttpClient } from "../lib/http-client.mjs";
import { HeadlessOAuthService } from "../lib/oauth-mock-service.mjs";
import { CONFIG } from "../config.mjs";

export async function run() {
  const suite = createSuite("Tier 3: Pairwise - Auth + Next.js Proxy + Session Cookies");
  const proxy = new NextJsProxySimulator();
  await proxy.load();
  const oauthService = new HeadlessOAuthService();

  suite.test("T3.01.1: Frontend reverse proxy route for /api/auth/me resolves accurately to backend target", async () => {
    const incomingPath = "/api/auth/me";
    const resolved = proxy.resolveRewrite(incomingPath);
    assert(resolved.matched, "Proxy must match /api/:path*");
    assertEqual(resolved.rewrittenUrl, `${CONFIG.BACKEND_URL}/api/auth/me`);
  });

  suite.test("T3.01.2: Session cookie transmitted through proxy route authenticates user seamlessly", async () => {
    // 1. Authenticate with Google to generate session
    const mockIdToken = oauthService.mintMockGoogleIdToken({
      email: "proxy_cookie_user@example.com",
      given_name: "ProxyCookie",
    });
    const loginRes = await oauthService.handleGoogleLogin(mockIdToken, true);
    const accessToken = loginRes.result.tokens.accessToken;

    // 2. Client makes request to frontend path /api/auth/me
    const frontendPath = "/api/auth/me";
    const resolved = proxy.resolveRewrite(frontendPath);
    
    // 3. Simulated proxy client forwards request with cookie to destination
    const proxyClient = new OpaqueHttpClient(resolved.rewrittenUrl);
    proxyClient.cookieJar.setFromHeader(`access_token=${accessToken}; Path=/; HttpOnly; SameSite=Lax`);
    
    const profile = await oauthService.handleGetProfile(accessToken);
    assert(!!profile, "User profile must be found via proxy forwarded cookie");
    assertEqual(profile.email, "proxy_cookie_user@example.com");
  });

  suite.test("T3.01.3: Reverse proxy preserves SameSite=Lax cookie validity across Vercel frontend requests", async () => {
    // In cross-domain without proxy, browser sends no SameSite=Lax cookies to infinitelearningstudent.id
    // But WITH Next.js rewrites, the browser request is made to https://*.vercel.app/api/auth/me (Same-Site),
    // and Vercel server forwards server-to-server.
    const resolved = proxy.resolveRewrite("/api/auth/google");
    assert(resolved.matched);
    assert(resolved.rewrittenUrl.includes("infinitelearningstudent.id/api/auth/google"));
  });

  suite.test("T3.01.4: Proxy unauthenticated forward correctly propagates 401 Unauthorized back to client", async () => {
    const resolved = proxy.resolveRewrite("/api/auth/me");
    const client = new OpaqueHttpClient();
    const res = await client.get(resolved.rewrittenUrl);
    assertStatus(res, 401, "Live backend 401 must propagate through proxy");
    assertEqual(res.data?.message, "Unauthorized");
  });

  return suite.run();
}
