// WiraDev E2E Test Harness & Assertions Utility
import crypto from "node:crypto";

export class AssertionError extends Error {
  constructor(message, actual, expected) {
    super(message);
    this.name = "AssertionError";
    this.actual = actual;
    this.expected = expected;
  }
}

export function assert(condition, message = "Assertion failed") {
  if (!condition) {
    throw new AssertionError(message, condition, true);
  }
}

export function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new AssertionError(
      message || `Expected ${JSON.stringify(actual)} to strictly equal ${JSON.stringify(expected)}`,
      actual,
      expected
    );
  }
}

export function assertDeepEqual(actual, expected, message) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new AssertionError(
      message || `Deep equality mismatch.\nActual:   ${actualStr}\nExpected: ${expectedStr}`,
      actual,
      expected
    );
  }
}

export function assertIncludes(actual, substringOrItem, message) {
  if (typeof actual === "string") {
    if (!actual.includes(substringOrItem)) {
      throw new AssertionError(
        message || `Expected string to contain "${substringOrItem}"\nReceived: "${actual}"`,
        actual,
        substringOrItem
      );
    }
  } else if (Array.isArray(actual)) {
    if (!actual.includes(substringOrItem)) {
      throw new AssertionError(
        message || `Expected array to contain item ${JSON.stringify(substringOrItem)}`,
        actual,
        substringOrItem
      );
    }
  } else {
    throw new AssertionError("assertIncludes only supports strings or arrays", actual, substringOrItem);
  }
}

export function assertMatch(actual, regex, message) {
  if (!regex.test(String(actual))) {
    throw new AssertionError(
      message || `Expected "${actual}" to match regex ${regex}`,
      actual,
      regex.toString()
    );
  }
}

export function assertStatus(response, expectedStatus, message) {
  const actual = response.status;
  if (actual !== expectedStatus) {
    throw new AssertionError(
      message || `Expected HTTP status ${expectedStatus}, but got ${actual}`,
      actual,
      expectedStatus
    );
  }
}

// -------------------------------------------------------------
// Pure Node JWT Utilities (HS256)
// -------------------------------------------------------------
export function createJwt(payload, secret = "access_secret", expiresInSeconds = 900) {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };
  const header = { alg: "HS256", typ: "JWT" };
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const unsigned = `${b64(header)}.${b64(fullPayload)}`;
  const signature = crypto.createHmac("sha256", secret).update(unsigned).digest("base64url");
  return `${unsigned}.${signature}`;
}

export function decodeJwt(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payloadJson = Buffer.from(parts[1], "base64url").toString("utf-8");
    return JSON.parse(payloadJson);
  } catch {
    return null;
  }
}

export function verifyJwt(token, secret = "access_secret") {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signature] = parts;
  const unsigned = `${headerB64}.${payloadB64}`;
  const expectedSig = crypto.createHmac("sha256", secret).update(unsigned).digest("base64url");
  if (signature !== expectedSig) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
}

// -------------------------------------------------------------
// Test Runner Harness
// -------------------------------------------------------------
export class TestSuite {
  constructor(name) {
    this.name = name;
    this.tests = [];
    this.results = [];
  }

  test(title, fn) {
    this.tests.push({ title, fn });
  }

  async run(options = { verbose: false }) {
    console.log(`\n  \x1b[36m▶\x1b[0m \x1b[1m${this.name}\x1b[0m`);
    let passedCount = 0;
    let failedCount = 0;

    for (const t of this.tests) {
      const startTime = Date.now();
      try {
        await t.fn();
        const duration = Date.now() - startTime;
        passedCount++;
        this.results.push({ title: t.title, status: "PASS", duration });
        console.log(`    \x1b[32m✔\x1b[0m ${t.title} \x1b[90m(${duration}ms)\x1b[0m`);
      } catch (err) {
        const duration = Date.now() - startTime;
        failedCount++;
        this.results.push({ title: t.title, status: "FAIL", error: err, duration });
        console.log(`    \x1b[31m✖\x1b[0m ${t.title} \x1b[90m(${duration}ms)\x1b[0m`);
        if (options.verbose || true) {
          console.error(`      \x1b[31mError:\x1b[0m ${err.message}`);
          if (err.actual !== undefined && err.expected !== undefined) {
            console.error(`      Actual:   ${JSON.stringify(err.actual)}`);
            console.error(`      Expected: ${JSON.stringify(err.expected)}`);
          }
        }
      }
    }

    return {
      suite: this.name,
      total: this.tests.length,
      passed: passedCount,
      failed: failedCount,
      results: this.results,
    };
  }
}

export function createSuite(name) {
  return new TestSuite(name);
}
