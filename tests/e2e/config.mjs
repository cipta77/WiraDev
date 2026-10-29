// WiraDev E2E Global Configuration
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const CONFIG = {
  // Production / Staging Backend Host
  BACKEND_URL: process.env.BACKEND_URL || "https://wirakarsa.infinitelearningstudent.id",
  
  // Vercel deployment test origin
  VERCEL_ORIGIN: process.env.VERCEL_ORIGIN || "https://wiradev-test.vercel.app",
  
  // Local project paths
  WORKSPACE_ROOT: path.resolve(__dirname, "../../"),
  FRONTEND_DIR: path.resolve(__dirname, "../../wiradev-fe"),
  BACKEND_DIR: path.resolve(__dirname, "../../wiradev-be"),
  
  // Timeouts (ms)
  REQUEST_TIMEOUT_MS: 15000,
  
  // Test Secret Keys (for mock signing and validation)
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || "access_secret",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "refresh_secret",
  
  // Mock Google & GitHub Client IDs
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "159334240812-3k5m6m19u2h5uljs0t5rckauajkovgel.apps.googleusercontent.com",
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || "mock_github_client_id_12345",
};
