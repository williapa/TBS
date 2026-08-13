import eslint from "@eslint/js";
import nx from "@nx/eslint-plugin";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/build/**",
      "**/dist/**",
      "**/node_modules/**",
      "supabase/functions/*/generated/**",
      "test-results/**",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  {
    plugins: {
      "@nx": nx,
    },
    rules: {
      "@nx/enforce-module-boundaries": [
        "error",
        {
          allow: [],
          depConstraints: [
            {
              sourceTag: "layer:domain",
              onlyDependOnLibsWithTags: ["layer:domain"],
            },
            {
              sourceTag: "layer:app",
              onlyDependOnLibsWithTags: [
                "layer:application",
                "layer:domain",
                "layer:infrastructure",
                "layer:presentation",
                "layer:renderer",
                "layer:test",
              ],
            },
            {
              sourceTag: "layer:presentation",
              onlyDependOnLibsWithTags: ["layer:domain", "layer:presentation"],
            },
            {
              sourceTag: "layer:renderer",
              onlyDependOnLibsWithTags: ["layer:presentation", "layer:renderer"],
            },
            {
              sourceTag: "layer:application",
              onlyDependOnLibsWithTags: ["layer:application", "layer:domain"],
            },
            {
              sourceTag: "layer:infrastructure",
              onlyDependOnLibsWithTags: ["layer:application", "layer:domain", "layer:infrastructure", "layer:test"],
            },
            {
              sourceTag: "layer:test",
              onlyDependOnLibsWithTags: ["layer:application", "layer:domain", "layer:test"],
            },
          ],
          enforceBuildableLibDependency: true,
        },
      ],
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
    },
  },
  {
    files: ["ui/src/**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      "react-hooks/exhaustive-deps": "error",
      "react-hooks/rules-of-hooks": "error",
    },
  },
  {
    files: ["ui/src/**/*.{ts,tsx}"],
    ignores: ["ui/src/**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{ group: ["@TBS/test-kit"], message: "Test-kit imports belong only in test files." }],
      }],
    },
  },
  {
    files: ["**/*.test.{ts,tsx}", "ui/src/setupTests.ts"],
    languageOptions: {
      globals: globals.vitest,
    },
  },
  {
    files: ["playwright.config.js", "scripts/**/*.mjs"],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    files: ["tests/e2e/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
);
