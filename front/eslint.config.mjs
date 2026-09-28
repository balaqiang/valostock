import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // src/lib/mock is demo data read only through src/lib/data/* (until the
  // Express API serves it). Only its types may be imported elsewhere.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/mock/**", "src/lib/data/**"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/mock/*"],
              allowTypeImports: true,
              message: "Mock files are demo data — read them via src/lib/data/* (later: the Express API).",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
