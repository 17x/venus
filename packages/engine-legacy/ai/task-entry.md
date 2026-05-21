# Engine Task Entry

Purpose:

- Fast route from task intent to starting files and validation commands.

## Refactor Task

Start files:

- src/runtime/createEngine/createEngine.ts
- src/renderer/webgl/webgl.ts
- src/renderer/plan/plan.ts

Validation:

1. pnpm --filter @venus/engine exec tsc --noEmit
2. pnpm governance:file-shape -- --changed --scope engine

## Performance Regression Task

Start files:

- src/runtime/createEngine/frameBudgetBroker/frameBudgetBroker.ts
- src/runtime/strategy/qosController.ts
- src/runtime/strategy/qosHardGuard.ts
- src/renderer/webgl/webgl.ts

Validation:

1. pnpm --filter @venus/engine exec tsc --noEmit
2. run relevant perf scripts under packages/engine/scripts if touched path requires it

## Rendering Correctness Task

Start files:

- src/runtime/createEngine/createEngineFrameResolver.ts
- src/renderer/webgl/core/pipeline.ts
- src/renderer/pipeline/partialRedrawPolicy.ts

Validation:

1. pnpm --filter @venus/engine exec tsc --noEmit
2. run targeted renderer tests for touched modules

## Hit/Interaction Task

Start files:

- src/scene/hit/resolver.ts
- src/renderer/hit/hitTest.ts
- src/runtime/createEngine/createEngineInteractionLifecycle.ts

Validation:

1. pnpm --filter @venus/engine exec tsc --noEmit
2. run targeted hit/interaction tests for touched modules

Execution rule:

- if task spans multiple entries, pick one primary entry and one secondary verifier file first.
