import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // next.config.ts sets `images.unoptimized: true`, so `next/image` renders a
    // plain <img> with no optimization, sizing or CDN benefit. Most sources here are
    // also user-uploaded data: URIs, blob: previews, or wildcard remote hosts, which
    // the image component cannot optimize anyway. Keeping <img> avoids the layout
    // risk of adding `fill` (which requires position:relative parents) for no gain.
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
  {
    // Standalone Node maintenance scripts at the repo root (asset curation helpers).
    // They run directly via `node script.js` and are not part of the Next.js build,
    // so CommonJS `require` is the correct module system for them.
    files: ["*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);

export default eslintConfig;
