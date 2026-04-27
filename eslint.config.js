import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/.turbo/**"],
  },
  {
    files: ["**/*.{ts,tsx,js,mjs,cjs}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@venus/*/src/*", "@venus/*/dist/*"],
              message:
                "Import package public APIs only. Do not couple to internal source or build-output paths.",
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      "apps/vector-editor-web/src/App.tsx",
      "apps/vector-editor-web/src/main.tsx",
      "apps/vector-editor-web/src/editor.worker.ts",
      "apps/vector-editor-web/src/editor/hooks/useEditorRuntime.ts",
      "packages/document-core/src/**/*.{ts,tsx}",
      "apps/vector-editor-web/src/editor/runtime-local/worker/**/*.{ts,tsx}",
      "packages/renderer-skia/src/**/*.{ts,tsx}",
      "packages/shared-memory/src/**/*.{ts,tsx}",
    ],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        self: "readonly",
        DedicatedWorkerGlobalScope: "readonly",
        SharedArrayBuffer: "readonly",
        crossOriginIsolated: "readonly",
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      semi: ["error", "never"],
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-check": true,
          "ts-expect-error": false,
          "ts-ignore": false,
          "ts-nocheck": false,
        },
      ],
    },
  },
);
