import js from "@eslint/js";
import jsdoc from "eslint-plugin-jsdoc";
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
    files: ["packages/engine/src/**/*.ts"],
    ignores: ["**/*.d.ts", "**/*.test.ts"],
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      jsdoc,
    },
    rules: {
      "no-magic-numbers": [
        "warn",
        {
          ignore: [-1, 0, 1],
          ignoreDefaultValues: true,
          ignoreClassFieldInitialValues: true,
          enforceConst: true,
          detectObjects: false,
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "jsdoc/require-jsdoc": [
        "error",
        {
          require: {
            FunctionDeclaration: true,
            MethodDefinition: false,
          },
        },
      ],
      "jsdoc/require-param": [
        "error",
        {
          checkDestructured: false,
        },
      ],
      "jsdoc/require-param-name": "error",
      "jsdoc/require-param-description": "error",
      "jsdoc/require-param-type": "off",
    },
  },
  {
    files: ["packages/engine/src/scene/**/*.ts"],
    ignores: ["**/*.d.ts", "**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "../interaction/**",
                "../../interaction/**",
                "../renderer/**",
                "../../renderer/**",
                "../runtime/**",
                "../../runtime/**",
                "../worker/**",
                "../../worker/**",
              ],
              message:
                "Scene layer must not depend on renderer/runtime/worker layers.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/engine/src/interaction/**/*.ts"],
    ignores: ["**/*.d.ts", "**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "../renderer/**",
                "../../renderer/**",
                "../runtime/**",
                "../../runtime/**",
                "../worker/**",
                "../../worker/**",
              ],
              message:
                "Interaction layer must remain independent from runtime/worker orchestration.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/engine/src/renderer/**/*.ts"],
    ignores: ["**/*.d.ts", "**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "../runtime/**",
                "../../runtime/**",
                "../worker/**",
                "../../worker/**",
              ],
              message:
                "Renderer layer must not depend on runtime/worker orchestration layers.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/engine/src/**/*.ts"],
    ignores: [
      "**/*.d.ts",
      "**/*.test.ts",
      "packages/engine/src/core/**/*.ts",
      "packages/engine/src/material/**/*.ts",
      "packages/engine/src/render/**/*.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/core/types.ts"],
              message:
                "Use blueprint render/types domain barrels instead of importing core/types directly.",
            },
            {
              group: ["**/core/renderGraph/**"],
              message:
                "Use render domain barrel instead of importing core/renderGraph modules directly.",
            },
            {
              group: ["**/core/materialLighting/**"],
              message:
                "Use material domain entrypoint instead of importing core/materialLighting modules directly.",
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      "packages/engine/src/renderer/webgl/runtime/resources.ts",
      "packages/engine/src/renderer/webgl/runtime/textures.ts",
      "packages/engine/src/renderer/webgl/runtime/runtimeHelpers.ts",
      "packages/engine/src/renderer/webgl/runtime/surfaceHelpers.ts",
      "packages/engine/src/renderer/webgl/core/pipeline.ts",
      "packages/engine/src/renderer/webgl/core/packets.ts",
      "packages/engine/src/renderer/webgl/tiles/textureIO.ts",
    ],
    ignores: ["**/*.d.ts", "**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "./webgl/webgl.ts",
              message:
                "WebGL helper modules must not import backend orchestration module.",
            },
            {
              name: "../webgl.ts",
              message:
                "WebGL helper modules must not import backend orchestration module.",
            },
            {
              name: "./webgl/capabilities/lodCapability.ts",
              message:
                "WebGL helper modules must not import capability modules.",
            },
            {
              name: "../capabilities/lodCapability.ts",
              message:
                "WebGL helper modules must not import capability modules.",
            },
            {
              name: "./webgl/capabilities/snapshotCapability.ts",
              message:
                "WebGL helper modules must not import capability modules.",
            },
            {
              name: "../capabilities/snapshotCapability.ts",
              message:
                "WebGL helper modules must not import capability modules.",
            },
            {
              name: "./webgl/capabilities/tileCacheCapability.ts",
              message:
                "WebGL helper modules must not import capability modules.",
            },
            {
              name: "../capabilities/tileCacheCapability.ts",
              message:
                "WebGL helper modules must not import capability modules.",
            },
            {
              name: "./webgl/capabilities/tileQueueCapability.ts",
              message:
                "WebGL helper modules must not import capability modules.",
            },
            {
              name: "../capabilities/tileQueueCapability.ts",
              message:
                "WebGL helper modules must not import capability modules.",
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      "packages/engine/src/renderer/webgl/capabilities/lodCapability.ts",
      "packages/engine/src/renderer/webgl/capabilities/snapshotCapability.ts",
      "packages/engine/src/renderer/webgl/capabilities/tileCacheCapability.ts",
      "packages/engine/src/renderer/webgl/capabilities/tileQueueCapability.ts",
    ],
    ignores: ["**/*.d.ts", "**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "../webgl.ts",
              message:
                "Capability modules must stay orchestration-agnostic and not import backend entry.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/lib/src/**/*.ts"],
    ignores: ["**/*.d.ts", "**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@venus/engine", "@venus/engine/*"],
              message:
                "@venus/lib must remain foundational and must not depend on engine modules.",
            },
            {
              group: ["@venus/editor-primitive", "@venus/editor-primitive/*"],
              message:
                "@venus/lib must not depend on interaction-layer packages.",
            },
            {
              group: ["@vector/*"],
              message:
                "@venus/lib must not depend on app/product-specific modules.",
            },
            {
              group: ["react", "react/*"],
              message:
                "@venus/lib must stay framework-agnostic and React-free.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/editor-primitive/src/**/*.ts"],
    ignores: ["**/*.d.ts", "**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@venus/engine", "@venus/engine/*"],
              message:
                "@venus/editor-primitive must stay engine-agnostic and consume only low-level contracts.",
            },
            {
              group: ["@vector/*"],
              message:
                "@venus/editor-primitive must not depend on product app modules.",
            },
            {
              group: ["react", "react/*"],
              message: "@venus/editor-primitive must stay framework-agnostic.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/editor-primitive/src/**/*.ts"],
    ignores: [
      "**/*.d.ts",
      "**/*.test.ts",
      "packages/editor-primitive/src/runtime/**/*.ts",
      "packages/editor-primitive/src/index.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../runtime/**", "../../runtime/**"],
              message:
                "Primitive modules must not depend on runtime orchestration modules.",
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
