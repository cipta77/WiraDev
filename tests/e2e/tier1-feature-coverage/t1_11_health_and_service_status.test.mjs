// Tier 1: Feature Coverage - Health & Service Status Check
import { createSuite, assert, assertEqual, assertStatus } from "../lib/test-utils.mjs";
import { OpaqueHttpClient } from "../lib/http-client.mjs";
import { CONFIG } from "../config.mjs";

export async function run() {
  const suite = createSuite("Tier 1: Health & Service Status Check");
  const client = new OpaqueHttpClient(CONFIG.BACKEND_URL);

  suite.test("T1.11.1: Live backend GET /health returns HTTP 200 OK", async () => {
    const res = await client.get("/health");
    assertStatus(res, 200, "Health probe must return 200");
  });

  suite.test("T1.11.2: Health payload top-level status is UP", async () => {
    const res = await client.get("/health");
    assertEqual(res.data?.status, "UP", "Status must equal UP");
  });

  suite.test("T1.11.3: Health services report database connection is UP", async () => {
    const res = await client.get("/health");
    assertEqual(res.data?.services?.database, "UP", "Database service must report UP");
  });

  suite.test("T1.11.4: Health services report express server is UP", async () => {
    const res = await client.get("/health");
    assertEqual(res.data?.services?.server, "UP", "Server service must report UP");
  });

  suite.test("T1.11.5: Health report includes non-negative uptime", async () => {
    const res = await client.get("/health");
    const uptime = res.data?.uptime;
    assert(typeof uptime === "number" && uptime > 0, "Uptime must be a positive number");
  });

  suite.test("T1.11.6: Health report contains valid ISO timestamp", async () => {
    const res = await client.get("/health");
    const timestamp = res.data?.timestamp;
    assert(typeof timestamp === "string", "Timestamp must be a string");
    const parsed = new Date(timestamp);
    assert(!isNaN(parsed.getTime()), "Timestamp must parse as valid Date");
  });

  return suite.run();
}
