import rootConfig from "../../eslint.config.js";

export default [
  ...rootConfig,
  {
    files: ["apps/vector-editor-web/src/runtime/**/*.{ts,tsx}"],
    rules: {
      // Runtime implementation must align to editor-primitive module contracts.
      // Disallow local class abstractions in runtime; use primitive contracts +
      // functional adapters unless an explicitly documented exception exists.
      "no-restricted-syntax": [
        "error",
        {
          selector: "ClassDeclaration",
          message:
            "Runtime must not define local classes; align implementation to @venus/editor-primitive module contracts.",
        },
        {
          selector: "ClassExpression",
          message:
            "Runtime must not define local class abstractions; use primitive contracts and functional adapters.",
        },
      ],
      // Enforce that runtime stays framework-agnostic and does not absorb app UI glue.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react", "react/*"],
              message:
                "Runtime modules must stay React-free and framework-agnostic.",
            },
            {
              group: [
                "../app/**",
                "../../app/**",
                "../product/**",
                "../../product/**",
                "../views/**",
                "../../views/**",
                "../ui/**",
                "../../ui/**",
                "../testing/**",
                "../../testing/**",
              ],
              message:
                "Runtime modules must not depend on app/product/views/ui/testing layers.",
            },
            {
              group: [
                "../../contexts/*",
                "../contexts/*",
                "@/contexts/*",
                "@vector/contexts/*",
              ],
              message:
                "Runtime modules must not import app context orchestration.",
            },
            {
              group: [
                "../../**/hooks/*",
                "../**/hooks/*",
                "@/**/hooks/*",
                "@vector/**/hooks/*",
              ],
              message:
                "Runtime modules must not import React hooks or hook-owned helpers.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["apps/vector-editor-web/src/ui/**/*.{ts,tsx}"],
    rules: {
      // Keep ui primitives independent from app/product/views/runtime orchestration layers.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "../app/**",
                "../../app/**",
                "../product/**",
                "../../product/**",
                "../views/**",
                "../../views/**",
                "../runtime/**",
                "../../runtime/**",
                "../testing/**",
                "../../testing/**",
              ],
              message:
                "UI modules must remain presentation-focused and layer-independent.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["apps/vector-editor-web/src/views/**/*.{ts,tsx}"],
    rules: {
      // Keep app shell ownership one-way: app composes views, views do not import app.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../app/**", "../../app/**"],
              message: "View modules must not import app shell modules.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["apps/vector-editor-web/src/product/**/*.{ts,tsx}"],
    rules: {
      // Keep product hooks independent from app shell/context implementation.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../app/**", "../../app/**"],
              message:
                "Product modules must not import app shell/context modules.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["apps/vector-editor-web/src/app/**/*.{ts,tsx}"],
    rules: {
      // Keep top-level app shell free from product hook internals.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../product/**", "../../product/**"],
              message: "App shell must not depend on product hook modules.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["apps/vector-editor-web/src/editor/runtime-local/**/*.{ts,tsx}"],
    rules: {
      // Keep runtime-local implementation independent from top-level facade aliases.
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@vector/runtime",
              message:
                "Runtime-local modules must import local modules directly, not the facade.",
            },
            {
              name: "@vector/runtime/interaction",
              message:
                "Runtime-local modules must avoid back-importing runtime interaction facade exports.",
            },
          ],
        },
      ],
    },
  },
];
