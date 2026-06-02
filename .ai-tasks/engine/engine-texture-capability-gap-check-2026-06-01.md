# Engine Texture Capability Gap Check (2026-06-01)

## Goal
- Validate whether current `engine` can support real-world texture workflows for `3deditor` + `game`.

## Current Capability (Observed)
- Runtime lighting API is available and works for color modulation.
- `strict3d` mesh path currently submits:
  - positions
  - indices
  - one flat color per mesh
- No native UV channel in mesh payload.
- No material texture sampling in WebGL native mesh presenter.
- No texture binding/state in runtime material API for 3D meshes.

## What We Did As MVP
- Integrated public CC0 texture assets into playground:
  - grass: `opengameart.org` CC0
  - asphalt: `opengameart.org` CC0
- Added runtime texture samplers (browser-side image sampling) and used sampled colors to synthesize textured tile layers in:
  - `apps/playground/src/demos/drivingGameScene.ts`
  - `apps/playground/src/runtime/threeEditor/buildThreeEditorEngineGraph.ts`
- This provides visible texture appearance while staying compatible with current engine contracts.

## Engine Gaps To Close (Productization)
1. Mesh UV support:
   - Add `uvs: readonly number[]` into mesh payload contract.
2. Material model:
   - Add `baseColorTexture` + sampler config (`repeat`, `offset`, `rotation`) to 3D material.
3. Native backend texture pipeline:
   - WebGL: upload texture, bind sampler, sample in fragment shader.
   - WebGPU parity path mirror.
4. Resource lifecycle:
   - Texture cache keys, eviction policy, diagnostics counters.
5. API docs:
   - Bilingual API docs for texture material workflow and sampler semantics.

## Recommended Next Implementation Order
1. `public-types/material.types.ts` extend texture fields.
2. `createEngine.ts` payload schema extension (`uvs`, material texture refs).
3. `webglNativeMeshPresenter.ts` shader upgrade (`aUv`, `uSampler`).
4. Diagnostics: texture uploads/cache hit/miss counters.
5. Playground migration: replace sampled-tile fallback with true UV textured meshes.
