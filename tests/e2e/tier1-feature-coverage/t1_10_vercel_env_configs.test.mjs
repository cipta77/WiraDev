// Tier 1: Feature Coverage - Vercel Deployment & Env Templates
import fs from "node:fs";
import path from "node:path";
import { createSuite, assert, assertEqual, assertIncludes } from "../lib/test-utils.mjs";
import { CONFIG } from "../config.mjs";

export async function run() {
  const suite = createSuite("Tier 1: Vercel Deployment & Environment Configurations");

  suite.test("T1.10.1: wiradev-fe/vercel.json exists and contains valid JSON", async () => {
    const vercelPath = path.resolve(CONFIG.FRONTEND_DIR, "vercel.json");
    assert(fs.existsSync(vercelPath), "vercel.json must exist in wiradev-fe");
    const content = JSON.parse(fs.readFileSync(vercelPath, "utf-8"));
    assert(typeof content === "object" && content !== null, "vercel.json must be a JSON object");
  });

  suite.test("T1.10.2: vercel.json designates nextjs framework", async () => {
    const vercelPath = path.resolve(CONFIG.FRONTEND_DIR, "vercel.json");
    const content = JSON.parse(fs.readFileSync(vercelPath, "utf-8"));
    assertEqual(content.framework, "nextjs", "Framework must be nextjs");
  });

  suite.test("T1.10.3: Frontend .env.example contains NEXT_PUBLIC_API_URL and OAuth client IDs", async () => {
    const feEnvPath = path.resolve(CONFIG.FRONTEND_DIR, ".env.example");
    assert(fs.existsSync(feEnvPath), "Frontend .env.example must exist");
    const content = fs.readFileSync(feEnvPath, "utf-8");
    assertIncludes(content, "NEXT_PUBLIC_API_URL=", "Must define NEXT_PUBLIC_API_URL");
    assertIncludes(content, "NEXT_PUBLIC_GOOGLE_CLIENT_ID=", "Must define NEXT_PUBLIC_GOOGLE_CLIENT_ID");
    assertIncludes(content, "NEXT_PUBLIC_GITHUB_CLIENT_ID=", "Must define NEXT_PUBLIC_GITHUB_CLIENT_ID");
  });

  suite.test("T1.10.4: Backend .env.example contains DB parameters and JWT secrets", async () => {
    const beEnvPath = path.resolve(CONFIG.BACKEND_DIR, ".env.example");
    assert(fs.existsSync(beEnvPath), "Backend .env.example must exist");
    const content = fs.readFileSync(beEnvPath, "utf-8");
    assertIncludes(content, "DB_HOST=", "Must specify DB_HOST");
    assertIncludes(content, "DB_NAME=", "Must specify DB_NAME");
    assertIncludes(content, "JWT_ACCESS_SECRET=", "Must specify JWT_ACCESS_SECRET");
    assertIncludes(content, "JWT_REFRESH_SECRET=", "Must specify JWT_REFRESH_SECRET");
  });

  suite.test("T1.10.5: Backend .env.example contains OAuth secrets for Google and GitHub", async () => {
    const beEnvPath = path.resolve(CONFIG.BACKEND_DIR, ".env.example");
    const content = fs.readFileSync(beEnvPath, "utf-8");
    assertIncludes(content, "GOOGLE_CLIENT_ID=", "Must specify GOOGLE_CLIENT_ID");
    assertIncludes(content, "GITHUB_CLIENT_ID=", "Must specify GITHUB_CLIENT_ID");
    assertIncludes(content, "GITHUB_CLIENT_SECRET=", "Must specify GITHUB_CLIENT_SECRET");
  });

  return suite.run();
}
