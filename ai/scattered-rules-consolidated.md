# Scattered Rules Consolidated - Generated on Sun May 17 22:56:39 CST 2026
## Source: ./packages/editor-primitive/EDITOR_PRIMITIVE_RESTRICTIONS.md
```markdown
# Editor Primitive Restrictions

This document applies engine-style ownership and dependency governance to `@venus/editor-primitive`.

## Scope

- `@venus/editor-primitive` owns package-agnostic editor interaction primitives.
- It provides deterministic contracts for input normalization, gesture resolution,
  operation lifecycle, selection, targeting, and runtime event dispatch.
- It must not absorb product shell behavior.

## Module Ownership

- Primitive layers:
  - `input|pointer|keyboard|shortcut|gesture|tool|selection|target|policy|capture|cursor|hover|overlay|overlay-model|control|viewport|command|operation`
- Runtime orchestration layer:
  - `runtime`
- Entry layer:
  - `index.ts` barrel only.

## Dependency Rules

- Allowed:
  - Primitive modules depending on lower-level primitive modules.
  - `runtime` depending on primitive modules.
- Forbidden:
  - Primitive modules importing `runtime` modules.
  - Any dependency on `@venus/engine`.
  - Any dependency on `@vector/*` app/product modules.
  - Any dependency on React (`react`, `react/*`).

## API Rules

- Keep contracts package-agnostic and runtime/pure where possible.
- Keep `runtime` as orchestration-only, not UI ownership.
- Keep top-level exports stable and explicit.

## Validation

- `pnpm --filter @venus/editor-primitive test`
```

## Source: ./packages/lib/LIB_RESTRICTIONS.md
```markdown
# Lib Restrictions

This document applies engine-style governance to `@venus/lib` based on its package role.

## Scope

- `@venus/lib` is the foundational layer for shared primitives.
- It must stay framework-agnostic and product-agnostic.
- It must not absorb engine runtime/rendering policy or app semantics.

## Ownership

- `math|geometry|ids|events|lifecycle|scheduler|patch|collections|logger|worker|serialization|assert|viewport`
  own reusable primitives only.
- `index.ts` is the package entrypoint barrel and must not add behavior.

## Dependency Rules

- Allowed:
  - Internal low-level dependencies among primitive modules when needed.
  - `geometry -> math`, `viewport -> math` style primitive composition.
- Forbidden:
  - Any dependency on `@venus/engine`.
  - Any dependency on `@venus/editor-primitive`.
  - Any dependency on `@vector/*` app/product modules.
  - Any dependency on React (`react`, `react/*`).

## API Rules

- Export only stable primitive contracts and deterministic helpers.
- Avoid product/domain naming in public contracts.
- Keep package entrypoint exports explicit and responsibility-scoped.

## Validation

- `pnpm --filter @venus/lib test`
- `pnpm --filter @venus/lib typecheck:test`
- Root lint/typecheck gates must remain green.

## Executable Governance
```

## Source: ./packages/engine/ENGINE_RESTRICTIONS.md
```markdown
# Engine Restrictions

This file defines hard implementation restrictions for `@venus/engine` changes.

## Scope Boundary

- Keep `@venus/engine` mechanism-only: render, scheduling primitives, geometry, spatial index, hit-test.
- Do not move product policy into engine (tool state, command semantics, history policy, UI behavior).
- Keep runtime/app ownership boundaries aligned with `docs/architecture/layering.md`.

## Module Ownership And One-Way Dependencies

- Engine top-level ownership is mandatory and enforced as one-way flow:
  - `math|time|utils|core` -> reusable primitives only
  - `scene` -> storage/index/bounds contracts only
  - `interaction` -> geometry/hit/viewport algorithms only
  - `renderer` -> draw-plan/render-backend only
  - `runtime` -> orchestration only
  - `worker` -> worker bridge/capability wiring only
- Allowed dependency flow:
  - `math|time|utils|core -> (none of renderer/runtime/worker)`
  - `scene -> math|time|utils|core`
  - `interaction -> scene|math|time|utils|core`
  - `renderer -> scene|interaction|math|time|utils|core`
  - `runtime -> renderer|scene|interaction|math|time|utils|core`
  - `worker -> runtime|renderer|scene|interaction|math|time|utils|core`
- Reverse edges are forbidden unless explicitly documented with `AI-TEMP:` and a removal condition.

## Renderer WebGL Subsystem Ownership

- Keep WebGL modules split by responsibility:
  - `renderer/webgl/` -> backend orchestrator
  - `renderer/webglComposite/` + `renderer/webglInteractionPreview/` -> preview/snapshot lane
  - `renderer/webgl*Capability.ts` -> capability state machines
  - `renderer/webglTiles.ts` + `renderer/webglTileTextureIO.ts` + tile manager/scheduler -> tile subsystem
  - `renderer/webglResources.ts|webglTextures.ts|webglSurfaceHelpers.ts|webglRuntimeHelpers.ts` -> resource/runtime helpers
- Helper modules must not import backend orchestrator or capability modules.
- Capability modules must not import backend orchestrator.

## Code Change Rules
```

## Source: ./apps/vector-editor-web/docs/module-restrictions.md
```markdown
# Vector Module Restrictions

This document applies engine-style ownership and one-way dependency governance to
`apps/vector-editor-web/src`, adapted to current module split and usage.

## Scope

- Product shell and composition stay in app-level modules.
- Runtime mechanism remains React-free and independent from app/product/views/ui.
- UI primitives remain presentation-oriented and layer-independent.

## Ownership Layers

- `runtime/`: framework-agnostic runtime mechanism.
- `ui/`: reusable UI primitives and tokens.
- `views/`: composed view surfaces.
- `product/`: product hooks and intent-to-runtime bridge.
- `app/`: top-level shell/bootstrap.
- `assets|i18n|testing`: support modules.

## Dependency Rules

- Enforced:
  - `runtime` must not import `app|product|views|ui|testing`.
  - `ui` must not import `app|product|views|runtime|testing`.
  - `views` must not import `app`.
  - `product` must not import `app`.
  - `app` must not import `product`.

## Runtime Purity

- Runtime modules must stay React-free.
- Runtime modules must not import app contexts or hook-owned helpers.
- Runtime-local implementation modules must not import `@vector/runtime` facade back.

## Runtime Primitive Alignment (Mandatory)

- Runtime interaction/overlay/cursor/shortcut/event handling must map to
  `@venus/editor-primitive` module definitions first.
- Local runtime modules may adapt primitive contracts, but must not create
```

