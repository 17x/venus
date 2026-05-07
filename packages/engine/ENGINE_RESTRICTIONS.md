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

- Every new or modified function must include a leading intent comment.
- Every touched module must include a top-of-file responsibility header comment summarizing ownership boundary.
- Add internal comments for non-obvious branches, fallback paths, cache/state transitions, and thresholds.
- For new or modified `type` / `interface` contracts, comment the declaration and changed fields.
- Temporary guards/fallbacks/compatibility branches must carry `AI-TEMP:` tags using:
  - `AI-TEMP: <why>; remove when <condition>; ref <task/doc>`

## Type Completeness And No-Hardcoding Rules

- Every engine change (add/modify/refactor attempt) must define complete TypeScript contracts before behavior changes.
- New or modified exported APIs must declare explicit parameter and return types; relying on implicit inference at module boundaries is forbidden.
- New or modified object payloads used across module boundaries must use named `type`/`interface` contracts with semantic comments.
- `any` is forbidden in engine runtime code and tests unless an approved compatibility exception is documented with `AI-TEMP:`.
- Hardcoded literals in engine behavior logic are forbidden.
- Numeric/string/boolean literals that affect rendering, scheduling, cache behavior, thresholds, or fallbacks must be extracted to named constants with clear intent.
- Exception-only literals are limited to structural language necessities (`0`, `1`, `-1` for index/counter mechanics) and discriminant literals required by public contracts.
- If a literal needs to stay inline for compatibility, annotate the branch with `AI-TEMP:` and reference the removal condition.

## Test Rules

- Any engine behavior change must include tests in `src/**/*.test.ts`.
- Scheduling changes must include deterministic tests with fake clocks/timers.
- Queue/priority logic must include starvation/fairness coverage.
- API contract changes must include declaration consistency checks in the same change set.

## Validation Rules

Run and pass these before handoff:

1. `pnpm --filter @venus/engine test`
2. `pnpm lint`
3. `pnpm typecheck`

If a command cannot run, document exactly why and what remains unverified.
