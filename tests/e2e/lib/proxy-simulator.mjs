// Next.js Rewrites & Security Headers Proxy Simulator
import path from "node:path";
import { pathToFileURL } from "node:url";
import { CONFIG } from "../config.mjs";

export class NextJsProxySimulator {
  constructor(nextConfigPath) {
    this.configPath = nextConfigPath || path.resolve(CONFIG.FRONTEND_DIR, "next.config.ts");
    this.nextConfig = null;
    this.rewritesList = [];
    this.headersList = [];
  }

  async load() {
    try {
      const fileUrl = pathToFileURL(this.configPath).href;
      const imported = await import(fileUrl);
      this.nextConfig = imported.default || imported;
      
      if (typeof this.nextConfig.rewrites === "function") {
        const rawRewrites = await this.nextConfig.rewrites();
        this.rewritesList = Array.isArray(rawRewrites)
          ? rawRewrites
          : rawRewrites.beforeFiles || [];
      }

      if (typeof this.nextConfig.headers === "function") {
        this.headersList = await this.nextConfig.headers();
      }
      return true;
    } catch (err) {
      throw new Error(`Failed to load Next.js configuration from ${this.configPath}: ${err.message}`);
    }
  }

  getRewrites() {
    return this.rewritesList;
  }

  getHeaders() {
    return this.headersList;
  }

  /**
   * Matches an incoming path against configured Next.js rewrites.
   * Supports Next.js wildcard patterns like /api/:path* -> https://target/api/:path*
   */
  resolveRewrite(requestPath) {
    for (const rule of this.rewritesList) {
      const source = rule.source;
      const destination = rule.destination;

      // Handle :path* wildcard matching
      if (source.includes(":path*")) {
        const prefix = source.replace(":path*", "");
        if (requestPath.startsWith(prefix)) {
          const suffix = requestPath.slice(prefix.length);
          const rewrittenUrl = destination.replace(":path*", suffix);
          return {
            matched: true,
            source,
            requestPath,
            rewrittenUrl,
          };
        }
      } else if (source === requestPath) {
        return {
          matched: true,
          source,
          requestPath,
          rewrittenUrl: destination,
        };
      }
    }

    return {
      matched: false,
      source: null,
      requestPath,
      rewrittenUrl: requestPath,
    };
  }

  /**
   * Matches an incoming path against configured Next.js custom headers.
   */
  resolveHeaders(requestPath) {
    const matchedHeaders = [];
    for (const rule of this.headersList) {
      if (rule.source === requestPath || (rule.source.endsWith("/:path*") && requestPath.startsWith(rule.source.replace("/:path*", "")))) {
        if (Array.isArray(rule.headers)) {
          matchedHeaders.push(...rule.headers);
        }
      }
    }
    return matchedHeaders;
  }
}
