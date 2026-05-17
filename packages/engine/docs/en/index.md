# Engine Documentation Index (EN)

This index is the entry point for current engine architecture and module logic.

## Reading Order

1. [Architecture And Dependency Graph](01-architecture-and-dependency-graph.md)
2. [Foundation Modules](02-foundation-modules.md)
3. [Scene And Visibility](03-scene-and-visibility.md)
4. [Interaction And Hit Testing](04-interaction-and-hit-testing.md)
5. [Renderer And GPU Pipeline](05-renderer-and-gpu-pipeline.md)
6. [Runtime Strategy Budget And Release](06-runtime-strategy-budget-and-release.md)
7. [Constraints Validation And Refactor Checklist](07-constraints-validation-and-refactor-checklist.md)

## Design Goal Summary

The engine is a mechanism layer. It must provide deterministic render and query capability while staying independent from product semantics.

Core goal chain:

1. Maintain render-facing scene state.
2. Produce stable frames through strategy-aware renderer orchestration.
3. Expose query and hit-test primitives.
4. Provide diagnostics and release-contract gates for runtime governance.

## Current Source Coverage

This documentation covers all top-level source domains under `packages/engine/src`:

- animation, assets, bench, camera, core, debug, geometry, gpu, index
- interaction, lighting, material, math, platform, render, renderer
- resource, runtime, scene, scheduler, settings, spatial, tests
- time, transform, types, utils, visibility, worker
