# Engine Module Override

Module:

- packages/engine

Local ownership:

- Runtime orchestration for frame assembly and renderer context handoff.
- Rendering and hit-test mechanisms with policy-controlled degradation/budget behavior.

Explicit non-responsibilities:

- Product-specific workflow or business semantics.
- App UI composition and page-level orchestration.

Critical entry points:

- src/runtime/createEngine/createEngine.ts
- src/renderer/webgl/webgl.ts
- src/renderer/plan/plan.ts
- src/scene/hit/resolver.ts

High-risk paths:

- frame strategy and budget propagation
- packet/fallback branch parity
- shortlist and visibility synchronization
- tile upload and cache eviction coupling

Boundary reminders:

- Keep engine -> lib dependency direction only.
- Avoid importing app/editor-primitive product policy into engine.

Local validation minimum:

1. pnpm --filter @venus/engine exec tsc --noEmit
2. pnpm governance:file-shape -- --changed --scope engine
