# Renderer And GPU Pipeline

## 1. Renderer Domain Goal

Renderer modules convert scene plans into deterministic frame output with strategy-aware fallback and cache control.

## 2. Module Families

1. Planning and instances

- `renderer/plan`, `renderer/instances`, `renderer/shared`.

2. Fallback taxonomy and diagnostics

- `renderer/fallbackTaxonomy`.

3. Tile subsystem

- `renderer/tileManager`, `renderer/tileScheduler`, `renderer/interactionPredictiveTiles`.

4. Pipeline contracts

- `renderer/pipeline`, `renderer/types`.

5. WebGL execution stack

- `renderer/webgl` orchestrator and capability modules.
- `renderer/webglComposite` for model-complete compositing.
- `renderer/webglInteractionPreview` for snapshot reuse.

6. WebGPU and Canvas paths

- `renderer/webgpu`, `renderer/canvas2d` for backend support and compatibility.

7. Layer/camera/hit/cache adjuncts

- `renderer/layers`, `renderer/camera`, `renderer/hit`, `renderer/cache`.

## 3. High-Level Render Flow

1. Build plan and packet/instance view.
2. Decide strategy lane: preview, tile, model-complete, packet fallback.
3. Apply budget/pressure constraints to uploads and draw submits.
4. Execute overlay pass and publish stats/fallback reason.

## 4. Limits And Governance

1. WebGL orchestrator must keep capability modules decoupled.
2. Helper/resource modules must not import orchestrator.
3. Cache reuse must validate consistency factors before accepting a hit.
4. Empty-frame states with non-empty scene must trigger safety fallback.

## 5. Current Stabilization Focus

1. Prevent blank frame across all fallback branches.
2. Ensure overscan is applied consistently in tile and planning-related candidate extraction.
3. Balance snapshot reuse against interaction stutter risk.
4. Guarantee zoom-stop full-detail recovery frame.
