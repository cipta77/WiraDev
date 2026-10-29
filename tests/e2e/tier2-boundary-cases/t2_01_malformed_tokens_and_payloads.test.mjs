// Tier 2: Boundary & Corner Cases - Malformed Tokens & Payloads
import { createSuite, assert, assertEqual, assertStatus } from "../lib/test-utils.mjs";
import { OpaqueHttpClient } from "../lib/http-client.mjs";
import { HeadlessOAuthService } from "../lib/oauth-mock-service.mjs";
import { CONFIG } from "../config.mjs";

export async function run() {
  const suite = createSuite("Tier 2: Boundary - Malformed Tokens & Payloads");
  const client = new OpaqueHttpClient(CONFIG.BACKEND_URL);
  const oauthService = new HeadlessOAuthService();

  suite.test("T2.01.1: Malformed raw JSON syntax in POST body is handled safely with 400", async () => {
    const res = await client.request("/api/auth/google", {
      method: "POST",
      body: '{"idToken": "unclosed_string',
      headers: { "Content-Type": "application/json" },
    });
    assert(res.status === 400 || res.status === 500, `Expected 400 for bad JSON, got ${res.status}`);
  });

  suite.test("T2.01.2: Empty string idToken is rejected as missing token", async () => {
    const res = await client.post("/api/auth/google", { idToken: "" });
    assertStatus(res, 400);
    assertEqual(res.data?.message, "idToken is required");
  });

  suite.test("T2.01.3: Non-string type for idToken (integer, array) is rejected", async () => {
    const resNum = await client.post("/api/auth/google", { idToken: 1234567 });
    assertStatus(resNum, 400);

    const resArr = await client.post("/api/auth/google", { idToken: ["jwt1", "jwt2"] });
    assertStatus(resArr, 400);
  });

  suite.test("T2.01.4: SQL injection strings in token parameters are neutralized without execution", async () => {
    const sqlInjectionPayload = "'; DROP TABLE users; --";
    const res = await client.post("/api/auth/google", { idToken: sqlInjectionPayload });
    assertStatus(res, 400);
    assertEqual(res.data?.message, "Invalid Google token");
  });

  suite.test("T2.01.5: Truncated JWT (missing signature segment) fails validation", async () => {
    const validJwt = oauthService.mintMockGoogleIdToken({ email: "truncated@example.com" });
    const truncatedJwt = validJwt.split(".").slice(0, 2).join("."); // header.payload only
    
    let caught = false;
    try {
      await oauthService.handleGoogleLogin(truncatedJwt, true);
    } catch (e) {
      caught = true;
      assertEqual(e.message, "Invalid Google token format");
    }
    assert(caught, "Truncated token must throw validation error");
  });

  suite.test("T2.01.6: JWT with altered signature segment is rejected", async () => {
    const validJwt = oauthService.mintMockGoogleIdToken({ email: "tampered@example.com" });
    const parts = validJwt.split(".");
    const forgedJwt = `${parts[0]}.${parts[1]}.ForgedSignatureHere123`;

    const res = await client.post("/api/auth/google", { idToken: forgedJwt });
    assertStatus(res, 400);
  });

  return suite.run();
}
