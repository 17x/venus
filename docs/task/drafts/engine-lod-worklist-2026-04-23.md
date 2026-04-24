# Engine LOD Worklist

Date: 2026-04-23
Status: in progress
Source: docs/architecture/engine-draft.md

## Objectives

- Turn the architecture draft into ordered implementation work.
- Start with the smallest engine-owned slice that improves behavior immediately.
- Keep ownership aligned with engine/runtime/app boundaries.

## Workstreams

### WS1. LOD Domain Model

- Define shared engine LOD input and output types.
- Separate render, hit, overlay, and cache decisions.
- Add interaction-aware inputs for active viewport motion.

### WS2. Candidate Query Pipeline

- Route viewport and hit-test candidate gathering through quadtree.
- Keep scene order and z-order sorting outside the index.

### WS3. Render Planning

- Introduce a frame-plan step before renderer execution.
- Move draw-time ad hoc LOD branching into plan construction.

### WS4. Hit Planning

- Add bbox-first hit-test modes and shortlist refinement.
- Keep hit precision consistent with visual LOD.

### WS5. Node Strategy Rollout

- Start with path, text, image, and group strategies.
- Add promotion rules for selected, hovered, editing, and transforming nodes.

### WS6. Cache Policy

- Add versioned cache keys, zoom buckets, and memory budget rules.
- Keep cache policy driven by the same LOD decision layer.

### WS7. Instrumentation

- Expose LOD tier, candidate count, cache hit rate, and hit precision counters.
- Add enough diagnostics to tune thresholds safely.

## Current Sprint Slice

1. Add interaction typing to engine LOD input.
2. Make viewport pan and zoom bypass interactive LOD degradation.
3. Keep the change engine-owned and wire it from existing adapters.
4. Extract reusable engine LOD domain types while preserving canvas compatibility.
5. Add explicit coarse candidate query surfaces for bounds, point, and viewport queries.
6. Validate in engine and vector-editor-web typecheck.

## Completed Today

- Pan and zoom no longer degrade through the LOD resolver.
- Engine now exposes generic LOD profile types alongside canvas compatibility aliases.
- Scene store now exposes explicit candidate query APIs for bounds and point queries.
- Engine facade now exposes viewport candidate queries for planner-facing callers.
- Engine now exposes a read-only frame plan API and records the latest frame plan in runtime diagnostics.
- Vector debug diagnostics now surface frame plan version, candidate count, scene node count, and candidate ratio.
- Render-prep now reads the previous frame-plan candidate set and reports dirty-in-candidate vs dirty-offscreen counts without changing draw behavior.
- Engine now exposes a read-only hit plan API, and runtime diagnostics surface hit shortlist candidate and hit counts.
- Renderer plan construction now consumes frame-plan candidate ids to prune non-candidate render work before batching.
- Hit execution now consumes coarse point candidates before precise checks and no longer needs a full flattened scene pass per query.
- Engine hit planning now reuses a shared `hitTestAll(...)` result between diagnostics and top-hit resolution.
- WebGL render prep now caches instance views by render-plan identity and packet plans by `plan + instanceView` identity.
- WebGL packet plans now precompute image/rich-text aggregates and immutable draw metadata so commit loops avoid repeated prepared-node reads and packet rescans.
- WebGL text texture reuse is now tied to frame signature (`revision + pixelRatio + scale`) so stale text rasters are flushed deterministically.
- WebGL text crop uploads now reuse a single scratch surface instead of allocating one temporary canvas per uncached text packet.
- Engine-facing docs now consistently state that WebGL is the primary backend and Canvas2D is auxiliary/offscreen support only.

## Next Slice

1. Tighten WebGL text upload planning further so crop/upload work is batched or reused across adjacent packets when signatures are stable.
2. Reduce compatibility-era backend exposure in engine/runtime API and nearby docs without breaking active callers.
3. Continue converging diagnostics around WebGL packet/resource pressure rather than legacy Canvas2D-first expectations.

## Acceptance For Current Slice

- Pan and zoom no longer increase LOD level.
- Pan and zoom no longer force interactive render quality through the LOD resolver.
- Existing non-pan/zoom interaction behavior remains unchanged.
- Engine and vector-editor-web compile cleanly.

## Notes

- Playground still references the shared LOD resolver, so type compatibility must be preserved.
- Any new code block added during this work must include a concise comment describing intent.
- Current renderer direction for engine work is WebGL-primary; Canvas2D optimization is only in scope when it directly supports auxiliary/offscreen WebGL behavior.
