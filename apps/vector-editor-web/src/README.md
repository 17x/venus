# Vector src Ownership Map

This file defines the ownership boundary for `apps/vector-editor-web/src`.

## Three-Way Isolation

The src tree enforces a three-way isolation: **UI / product (React) / React-free runtime**.

- `ui/` — pure UI primitives and design tokens. No product semantics, no runtime knowledge.
- `views/` and `product/` — React layer. Composition (`views/`) and hooks (`product/`).
- `runtime/` — pure (React-free) runtime engine. Owns model, interaction mechanism, worker bridge, persisted document contracts.

## Folders

- `app/` — application shell and bootstrap (`App.tsx`, `main.tsx`, `editor.worker.ts`, `index.css`, `contexts/`).
- `assets/` — static visual assets (icons, SVG).
- `views/` — composed React product surfaces (shell, panels, toolbar, inspector, status UI, interaction overlay rendering).
- `product/` — React hooks, derived state, action dispatch. Bridges runtime to React.
- `runtime/` — framework-agnostic runtime root: events, commands, interaction mechanism, worker, shared-memory, engine-bridge, model, adapters, render-prep, shell, tools, gesture, shortcut handler, template presets, image helpers.
- `ui/` — UI primitives, kit composition, design tokens (`ui/lib/cn` is the shared `cn` helper).
- `i18n/` — locale resources and i18n integration helpers.
- `testing/` — app test constants and test-only helpers.

## Editor Type Ownership

- `runtime/types/editorElement.ts` — editor element/event contracts shared across runtime, product, and views.
- `runtime/model/*` — runtime canonical scene/document/tool geometry model used by interaction, worker, and adapters.
- `runtime/types/editorFile.ts` — persisted editor-file schema (`EditorFileDocument`, `EditorFileAsset`, `EditorFilePageSpec`) shared by runtime adapters and product/app contexts.
- `product/useEditorRuntime/types.ts` — React-facing runtime hook state/command/UI contracts only (no longer owns persisted file schema).

## Aliases

- **No `@vector/*` or `@/*` aliases.** All imports inside `src/` use explicit relative paths.
- The only path mappings (`tsconfig.app.json`) are workspace package references: `@venus/lib`, `@venus/engine`, `@venus/editor-primitive`.

## Layering Boundary

`app -> views + product -> runtime -> @venus/engine`

- `app/` orchestrates bootstrap and global providers.
- `views/` holds React composition; no runtime mutation lives here.
- `product/` holds React hooks that translate user intent into runtime commands.
- `runtime/` is framework-agnostic. It must not import React, views, product, or app modules.
- `@venus/engine` is consumed by `runtime/` and is the lowest layer.

## Cleanup Rules

- Prefer explicit exports over broad wildcard barrel exports.
- Delete zero-reference files and generated artifacts instead of parking dead code.
- Keep source files under practical size limits and split by ownership responsibility.
