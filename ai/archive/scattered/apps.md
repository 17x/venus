## Source: ./apps/README.md
```markdown
# Apps Workspace

Apps under `apps/*` are product surfaces. They orchestrate runtime behavior,
compose UI flows, and wire package capabilities into runnable experiences.

## Responsibility Boundary

- Own product UX, route-level composition, and editor shell integration.
- Own app-specific feature toggles, menu wiring, and diagnostics views.
- Do not duplicate shared runtime/engine mechanisms that belong in `packages/*`.

## Current Apps

- `vector-editor-web`: primary vector editor product surface.
- `playground`: diagnostics and runtime behavior sandbox.
- `flowchart`: flowchart-focused app surface.
- `streamline-editor`: streamline/diagram-focused editor scaffold.
- `mindmap-editor`: mindmap-focused editor scaffold.
- `whiteboard`: whiteboard app surface.

## Implementation Guidance

- Keep app bootstrapping and product workflows in `apps/*`.
- Move reusable primitives and cross-app runtime logic to `packages/*`.
- Prefer `@venus/*` shared packages (or app-local `@vector/*` aliases) over app-to-app imports.
```

## Source: ./apps/vector-editor-web/docs/architecture.md
```markdown
# Vector Editor Architecture

This is the canonical home for vector-editor-specific architecture and
integration notes. Keep product-only behavior, editor-shell composition, and
vector adoption guidance here instead of under `docs/`.

## Product Boundary

- App ownership stays in `apps/vector-editor-web`.
- Runtime ownership stays in `@venus/runtime` and `@venus/runtime/interaction`.
- Engine ownership stays in `@venus/engine`.
- Persisted document semantics stay in `@vector/model`.

Current runtime chain:

`apps/vector-editor-web` -> `@venus/runtime` + `@venus/runtime/interaction` -> `@venus/runtime/worker` + `@venus/runtime/shared-memory` -> `@venus/engine`

## What Belongs Here

- Product overlay behavior and editor-shell composition.
- Vector-specific runtime bridge wiring and adoption notes.
- Tool orchestration, panel composition, and editor-only workflow detail.
- App-local documentation governance for this product surface.

## What Does Not Belong Here

- Global architecture rules that apply to the whole monorepo.
- Engine mechanism documentation.
- Root governance or changelog material.

## Current App Shape

- The app is the product shell: toolbar, header, panels, canvas frame, and
  status surfaces.
- High-frequency scene mutation runs through runtime and worker paths, not in
  React component state.
- Canvas and gesture wiring stay app-local, but shared interaction policy must
  stay in runtime layers.

## Important Surfaces
```

## Source: ./apps/vector-editor-web/docs/engine-bridge-remediation-change-request-2026-05-17.md
```markdown
# Vector Engine Bridge Remediation Change Request (2026-05-17)

[CHANGE REQUEST]

Target:

- File / Module:
  - `apps/vector-editor-web/src/runtime/engine-bridge/engine.ts`
  - `apps/vector-editor-web/src/runtime/core/createCanvasRuntimeApi.ts`
  - `apps/vector-editor-web/src/runtime/interaction/selectionDragController.ts`
  - `apps/vector-editor-web/src/runtime/engine-bridge/internal/engineRenderer/useEngineRendererSceneSync.ts`
  - `apps/vector-editor-web/src/runtime/presets/engineSceneAdapter/engineSceneAdapter.ts`
  - `apps/vector-editor-web/src/runtime/engine-bridge/internal/engineRenderer/engineSceneProfile.ts`
  - `apps/vector-editor-web/src/runtime/engine-bridge/internal/engineRenderer/engineRenderer.tsx`
  - `apps/vector-editor-web/src/runtime/engine-bridge/internal/__tests__/engineSceneSyncPolicy.test.ts`
  - `apps/vector-editor-web/src/runtime/presets/engineSceneAdapter/engineSceneAdapter.test.ts`

Goal:

- Problem being solved:
  - Vector runtime still has scattered direct engine imports and duplicated scene-prep triggers.
  - Scene adapter lacks explicit 3D-readiness contract fields for lighting/material compatibility.
  - Engine bridge profile is static and not explicit about adapter/runtime compatibility defaults.
  - Test coverage is missing for scene-sync fast-path policy and scene adapter compatibility fields.

Change Type:

- Modify / Add

Impact:

- Affected modules:
  - Vector runtime engine bridge, interaction drag controller, scene adapter presets.

Cleanup:

- Old logic to remove:
  - Direct package-level engine calls in runtime modules where facade contract already exists.
  - Overly strict scene fast-path identity gate that re-runs prep when revision is stable.

```

## Source: ./apps/vector-editor-web/README.md
```markdown
# `@venus/vector-editor-web`

`vector-editor-web` is the product-facing editor app in the Venus monorepo.

## Local Docs

- Product architecture and app-only integration notes live in
  `./docs/architecture.md`.
- Keep vector-specific documentation in this app directory instead of under
  global `docs/`.

## Run

From repo root:

```sh
pnpm --filter @venus/vector-editor-web dev
```

Build:

```sh
pnpm --filter @venus/vector-editor-web build
```

Type-check:

```sh
pnpm --filter @venus/vector-editor-web exec tsc --noEmit -p tsconfig.app.json
```

## Architecture in This App

Current runtime path:

`useEditorRuntime`
-> app-local runtime bridge (`@vector/runtime*` aliases)
-> `@venus/editor-primitive` interaction primitives
-> `@venus/engine`

```

## Source: ./apps/vector-editor-web/scripts/README.md
```markdown
# vector-editor-web scripts

This directory contains operational scripts for quality gates and diagnostics.

## Keep

- `ui-style-guard.mjs` - lint pipeline gate, required by `package.json` `lint` script.
- `perf-gate.mjs` - performance gate checker used by `perf:gate` commands.
- `perf-gate.config.json` - threshold config consumed by `perf-gate.mjs`.
- `perf-gate.report.template.json` - baseline input for template gate runs.
- `boolean-contour-regression.ts` - geometry regression checks for boolean/contour paths.
- `playwright-fps-check.mjs` - optional FPS diagnostics script.

## Do Not Commit

- Generated run outputs (for example `*.result.json`) should stay local CI/workspace artifacts.

## Usage

```zsh
pnpm --filter @venus/vector-editor-web lint
pnpm --filter @venus/vector-editor-web perf:gate
pnpm --filter @venus/vector-editor-web regression:boolean-contour
pnpm --filter @venus/vector-editor-web perf:fps:playwright
```

```

## Source: ./apps/vector-editor-web/src/ui/README.md
```markdown
# Vector UI Structure

This app owns its UI stack under `src/ui`.

## Folders

- `foundation/`
  - `tokens.css`: design tokens (color, typography, spacing, radius, motion)
  - `semantic.css`: semantic utility/component classes built from tokens
  - `theme/themeProvider.tsx`: `light | dark | system` mode state and persistence
- `primitives/`
  - shadcn/base-ui generated primitive source files adapted for the vector app
- `kit/`
  - compatibility and product-facing wrappers exported through `src/ui`
- `index.ts`
  - single export entry for app-wide UI imports (`src/ui` alias)

## Conventions

- Keep visual constants in `foundation/tokens.css`; avoid hardcoded colors in feature components.
- Keep Tailwind utility usage focused on layout/structure; route semantic colors and typography through CSS variables.
- Borders and shadows are opt-in at call sites; shared primitives should default to borderless and shadowless surfaces.
- `useTheme()` exposes both mode state and the resolved theme palette (`primary`, `secondary`, `tertiary` / `thirdly`, hover colors).
- Keep primitive source files in `primitives/`, then wrap or theme them from `kit/components/ui` when needed.
- Put feature-composed components under feature folders (`src/components/*`) and consume `src/ui` exports.

## Primitive Source Of Truth

- Vector UI primitives must be generated from shadcn base UI.
- Canonical generated files live in `src/ui/primitives/*`.
- `src/ui/kit/components/ui/*` is the compatibility/export layer for `src/ui` and should wrap `src/ui/primitives/*` instead of re-implementing them.
- When introducing or updating primitives, run shadcn CLI first, then apply minimal compatibility patches.
- Semantic surfaces such as menu/context-menu/tabs/input-group must use the generated shadcn primitives (`dropdown-menu`, `context-menu`, `tabs`, `input-group`) via `src/ui` exports.
```

## Source: ./apps/vector-editor-web/src/runtime/README.md
```markdown
# Runtime Folder Ownership

This folder is the app-local runtime facade and pure editor-runtime code surface.

## Responsibilities

- expose stable runtime APIs for app imports (the runtime layer, runtime subpaths)
- host framework-agnostic runtime/event/command contracts
- bridge vector product requirements onto shared runtime and worker packages

## Alias Governance

- keep runtime subpaths path mapping on `src/runtime/*` only (no long per-subpath alias lists)
- add thin facade bridge files in this folder (`engine.ts`, `worker.ts`, `shared-memory.ts`, `presets.ts`) when a new runtime subpath is needed

## Non-Responsibilities

- no React component rendering
- no app context orchestration
- no hook-owned UI state logic

## Placement Rule

- if code depends on React component lifecycle, context providers, or UI rendering, place it outside `src/runtime`
- if code is pure runtime behavior (commands, events, protocol, document/runtime adaptation), keep it in `src/runtime`

## Fusion Status

- runtime implementation is being migrated from `src/editor/runtime-local/*` to `src/runtime/*` in slices
- migrated slices (`chrome`, `cursor`, `editing-modes`, `commands`, `tools`, `hittest`, `viewport`, `zoom`) now live only under `src/runtime/*`
- engine facade ownership now lives in `src/runtime/engine.ts` with a temporary compatibility bridge retained under `src/editor/runtime-local/engine.ts`
- remaining runtime-local modules are migration backlog and should be moved in the same ownership direction

```

## Source: ./apps/vector-editor-web/src/README.md
```markdown
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
```

