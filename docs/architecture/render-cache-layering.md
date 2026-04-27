# Render Cache Layering (100K Policy)

## Goal

Define the business logic between:

- LOD decision pipeline
- tile cache policy
- layered cache policy (frame reuse, composite reuse, tile/static cache)

This policy is the execution contract for large-scene optimization in
`@venus/engine` and app adapters, especially 50K-100K+ element scenes.

## Current State (As-Is)

- WebGL is the primary render backend.
- Canvas2D is used as auxiliary model-complete/composite support.
- LOD decision exists and is consumed by app/runtime render quality controls.
- Interaction preview frame reuse exists (`frameReuseHits/Misses`).
- Tile cache manager now participates in WebGL settled-frame execution:
  dirty tiles are invalidated from runtime dirty-region messages and visible
  tiles are rebuilt/reused from the model surface in the model-complete path.
- Layered cache diagnostics (`L0/L1/L2` hit/miss + fallback reason) are
  emitted through render stats and surfaced in runtime debug diagnostics.

Implication:

- Visual drift and fallback analysis must now be diagnosed with layered cache
  counters before assuming a single-path issue.

## Layered Cache Model

Use the following cache layer names consistently:

1. `L0 Preview Reuse`
2. `L1 Composite Cache`
3. `L2 Tile Cache`

### L0 Preview Reuse

- Purpose: keep interaction FPS stable during pan/zoom bursts.
- Source: last committed full frame (or equivalent stable baseline).
- Lifetime: short, interaction-window only.
- Data: full-frame texture/canvas, affine transform reuse only.

### L1 Composite Cache

- Purpose: preserve model-complete fidelity while avoiding repeated full
  expensive rebuild on tiny scene deltas.
- Source: model-complete path output promoted to WebGL composite texture.
- Lifetime: medium; invalidated by scene revision/viewport signature changes.

### L2 Tile Cache

- Purpose: reduce full-frame rerender cost for large static regions.
- Source: tile-granular static layer outputs.
- Lifetime: long; invalidated by dirty bounds + zoom bucket transitions.

## Execution Order

Per frame, resolve in this order:

1. Build render intent from LOD + interaction state.
2. Attempt `L0 Preview Reuse` only when interaction quality is active.
3. If `L0` miss, attempt `L1 Composite Cache` when non-interactive and
   model-complete requirements are present.
4. If `L1` miss, resolve `L2 Tile Cache` candidates for static layers.
5. Fall back to packet/model render path for all misses and dynamic layers.

Rule:

- A higher-priority layer may only reuse output that is transform-compatible
  with the current viewport signature.

## Phase-Based Render Policy Service

Runtime/app adapters must resolve render behavior through a phase policy entry
instead of scattered inline conditionals.

Current baseline service:

- `resolveRuntimeRenderPolicy` with phases: `interactive` and `settled`
- Policy outputs: effective render `quality` and `dpr`

Contract:

- `interactive`: prefer lower-cost render posture (bounded DPR, interaction-safe quality)
- `settled`: restore fidelity posture (`auto` DPR and full-quality path when allowed)

Reason:

- Keeps phase behavior auditable and tunable in one place before expanding to
  additional phases (`pan`, `zoom`, `drag`, `precision-edit`, `idle`)

## Viewport Signature Contract

All cache layers must compare against a shared viewport signature:

- `scale`
- `offsetX`
- `offsetY`
- `viewportWidth`
- `viewportHeight`
- `pixelRatio`

Optional extension:

- overscan dimensions and overscan offset when app adapter renders with expanded
  backing surfaces.

If signature is incompatible:

- do not reuse cache;
- fall back to next layer or full render.

## LOD To Cache Mapping

Business mapping for 100K policy:

- `LOD 0` (full detail): prefer `L1` then full render; tile optional.
- `LOD 1` (simplified): allow `L2` for static regions, packet for dynamic.
- `LOD 2` (outline/block): prefer `L2` + cheap dynamic overlay redraw.
- `LOD 3` (dot/skip): minimize dynamic redraw; keep cache granularity coarse.

Interaction override:

- During active pan/zoom, `L0` is allowed.
- During active editing/transform precision interactions, `L0` must be bypassed
  when it can hide positional truth.

## Invalidation Matrix

### Scene mutation

- Invalidate `L1` for affected frame signature.
- Invalidate `L2` tiles intersecting dirty world bounds for current zoom bucket.
- `L0` is dropped immediately after mutation commit.

### Viewport translation only

- `L0` may reuse if affine constraints pass.
- `L1`/`L2` remain valid if signature policy allows translation reuse.

### Viewport scale change

- `L0` may reuse within configured scale-step threshold.
- `L2` should switch zoom bucket when threshold is crossed.
- `L1` must be revalidated against scale + pixel ratio.

### DPR change

- Invalidate all layers (`L0`, `L1`, `L2`) unless explicitly stored per DPR.

## Dynamic vs Static Layer Rules

- Dynamic layers: selection handles, hover indicators, marquee, snap guides,
  active transform previews.
- Static layers: settled scene geometry and non-interactive decoration.

Policy:

- `L2 Tile Cache` only stores static layer outputs.
- Dynamic layers must redraw from current truth each frame.
- Never cache dynamic overlay into static tiles.

## Correctness-First Guards

To prevent "first correct, then offset, interaction recovers" regressions:

1. Do not start a delayed second-phase render that changes DPR or transform
   basis after first committed stable frame.
2. Do not reuse preview/composite cache if viewport readiness is not confirmed.
3. Always anchor reuse transforms to the latest stable baseline frame, not a
   previously transformed preview frame.

## Observability Requirements

Expose these diagnostics at runtime debug panel level:

- LOD level and render quality mode
- `L0/L1/L2` hit/miss counters
- cache invalidation reason counters
- tile dirty count and tile residency bytes
- fallback reason (`signature-mismatch`, `dpr-change`, `interaction-guard`)
- shortlist stability diagnostics:
  `toggleCount`, `debounceBlockedToggleCount`, threshold zone
  (`enter`/`hysteresis`/`leave`), and shortlist coverage/gap ratios

## 100K Rollout Order

1. Lock this policy as architecture contract.
2. Keep correctness guardrails enabled in app adapters.
3. Wire `L2 Tile Cache` invalidation and draw reuse in WebGL path.
4. Add per-layer counters and fallback reasons.
5. Tune thresholds using diagnostics, not ad-hoc behavior changes.
