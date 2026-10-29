// WiraDev Opaque HTTP Client with Cookie Jar and CORS handling
import { CONFIG } from "../config.mjs";

export class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  setFromHeader(setCookieHeader) {
    if (!setCookieHeader) return;
    
    // In node-fetch/native fetch, getSetCookie() returns array if available
    const headerLines = Array.isArray(setCookieHeader)
      ? setCookieHeader
      : [setCookieHeader];

    for (const line of headerLines) {
      if (!line) continue;
      // Split individual cookies if combined with commas (ignoring commas inside Expires dates)
      // A standard Set-Cookie directive: "name=value; Path=/; Expires=..."
      const parts = line.split(";").map((p) => p.trim());
      const [nameVal] = parts;
      const eqIdx = nameVal.indexOf("=");
      if (eqIdx === -1) continue;
      const name = nameVal.substring(0, eqIdx).trim();
      const value = nameVal.substring(eqIdx + 1).trim();

      // Check for expiration
      let isExpired = false;
      for (const attr of parts.slice(1)) {
        const lower = attr.toLowerCase();
        if (lower.startsWith("expires=")) {
          const expDate = new Date(attr.substring(8));
          if (!isNaN(expDate.getTime()) && expDate.getTime() <= Date.now()) {
            isExpired = true;
          }
        } else if (lower.startsWith("max-age=")) {
          const maxAge = parseInt(attr.substring(8), 10);
          if (maxAge <= 0) {
            isExpired = true;
          }
        }
      }

      if (isExpired || value === "") {
        this.cookies.delete(name);
      } else {
        this.cookies.set(name, {
          value,
          raw: line,
          isHttpOnly: parts.some((p) => p.toLowerCase() === "httponly"),
          sameSite: parts.find((p) => p.toLowerCase().startsWith("samesite="))?.split("=")[1] || "Lax",
        });
      }
    }
  }

  get(name) {
    return this.cookies.get(name)?.value;
  }

  getCookieMeta(name) {
    return this.cookies.get(name);
  }

  has(name) {
    return this.cookies.has(name);
  }

  delete(name) {
    this.cookies.delete(name);
  }

  clear() {
    this.cookies.clear();
  }

  getCookieHeader() {
    if (this.cookies.size === 0) return "";
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v.value}`)
      .join("; ");
  }

  getAll() {
    return Object.fromEntries(
      Array.from(this.cookies.entries()).map(([k, v]) => [k, v.value])
    );
  }
}

export class OpaqueHttpClient {
  constructor(baseUrl = CONFIG.BACKEND_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.cookieJar = new CookieJar();
    this.bearerToken = null;
    this.defaultOrigin = CONFIG.VERCEL_ORIGIN;
  }

  setBearerToken(token) {
    this.bearerToken = token;
  }

  clearBearerToken() {
    this.bearerToken = null;
  }

  async request(path, options = {}) {
    const fullUrl = path.startsWith("http://") || path.startsWith("https://")
      ? path
      : `${this.baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;

    const headers = new Headers(options.headers || {});

    // Default headers
    if (!headers.has("Accept")) {
      headers.set("Accept", "application/json");
    }
    if (!headers.has("Origin") && this.defaultOrigin) {
      headers.set("Origin", this.defaultOrigin);
    }
    if (!headers.has("Content-Type") && options.body && typeof options.body === "string") {
      headers.set("Content-Type", "application/json");
    }

    // Attach Bearer token if configured and not explicitly provided
    if (this.bearerToken && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${this.bearerToken}`);
    }

    // Attach Cookie header from cookie jar
    const cookieHeader = this.cookieJar.getCookieHeader();
    if (cookieHeader && !headers.has("Cookie")) {
      headers.set("Cookie", cookieHeader);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeout || CONFIG.REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(fullUrl, {
        method: options.method || "GET",
        headers,
        body: options.body,
        redirect: options.redirect || "follow",
        signal: controller.signal,
      });

      // Capture Set-Cookie headers
      if (typeof response.headers.getSetCookie === "function") {
        const rawCookies = response.headers.getSetCookie();
        if (rawCookies && rawCookies.length > 0) {
          this.cookieJar.setFromHeader(rawCookies);
        }
      } else {
        const rawCookie = response.headers.get("set-cookie");
        if (rawCookie) {
          this.cookieJar.setFromHeader(rawCookie);
        }
      }

      // Parse body if JSON
      let data = null;
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        try {
          data = await response.json();
        } catch {
          data = null;
        }
      } else {
        try {
          data = await response.text();
        } catch {
          data = null;
        }
      }

      return {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: response.headers,
        data,
        raw: response,
        cookieJar: this.cookieJar,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async get(path, options = {}) {
    return this.request(path, { ...options, method: "GET" });
  }

  async post(path, body, options = {}) {
    const serializedBody = typeof body === "object" ? JSON.stringify(body) : body;
    return this.request(path, { ...options, method: "POST", body: serializedBody });
  }

  async patch(path, body, options = {}) {
    const serializedBody = typeof body === "object" ? JSON.stringify(body) : body;
    return this.request(path, { ...options, method: "PATCH", body: serializedBody });
  }

  async put(path, body, options = {}) {
    const serializedBody = typeof body === "object" ? JSON.stringify(body) : body;
    return this.request(path, { ...options, method: "PUT", body: serializedBody });
  }

  async delete(path, options = {}) {
    return this.request(path, { ...options, method: "DELETE" });
  }

  async options(path, options = {}) {
    return this.request(path, { ...options, method: "OPTIONS" });
  }
}
