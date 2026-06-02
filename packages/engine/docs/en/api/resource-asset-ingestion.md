# Resource And Asset Ingestion API

Status: Release contract draft.
Scope: ENG-004.

Engine resource ingestion is generic. App adapters translate domain files into engine resources before submission.

## Generic Resource Families

- Geometry resources: mesh, primitive, polyline, point cloud, volume slice payload.
- Material resources: color, texture reference, transparency, render flags.
- Texture resources: image source, decode state, compression state, residency state.
- Animation resources: keyframe tracks, deterministic revision ids, playback ranges.
- Volume resources: scalar fields, slice descriptors, transfer function handles.

## Graph Material Texture Contract

`engine.setGraph(input)` accepts graph-level `materials` and mesh-level `uvs` so scenario adapters can submit true material/texture contracts without baking sampled colors into many small primitives.

```ts
engine.setGraph({
  materials: [{
    id: "mat-a",
    type: "pbr",
    name: "Material A",
    baseColor: [1, 1, 1, 1],
    metallic: 0,
    roughness: 0.8,
    emissive: [0, 0, 0],
    emissiveIntensity: 0,
    normalScale: 1,
    aoStrength: 1,
    opacity: 1,
    transparent: false,
    alphaTest: 0,
    doubleSided: false,
    baseColorTexture: "/textures/albedo.png",
    baseColorTextureSampler: {
      wrapS: "repeat",
      wrapT: "repeat",
      minFilter: "linear",
      magFilter: "linear",
    },
  }],
  nodes: [{
    id: "mesh-a",
    materialId: "mat-a",
    mesh: {
      positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
      indices: [0, 1, 2],
      uvs: [0, 0, 1, 0, 0, 1],
      materialId: "mat-a",
    },
  }],
})
```

Current status:

- Graph contract, public types, material texture refs, sampler descriptors, and mesh UV payloads are supported.
- WebGL native mesh diagnostics expose material texture readiness:
  - `webglNativeMaterialTextureCandidateCount`
  - `webglNativeMaterialTextureUvReadyCount`
  - `webglNativeMaterialTextureBindingCount`
  - `webglNativeMaterialTextureUploadBytes`
  - `webglNativeMaterialTextureCacheHitCount`
  - `webglNativeMaterialTextureCacheMissCount`
  - `webglNativeMaterialTextureDecodeFailureCount`
  - `webglNativeMaterialTextureDecodeFailureReason`
  - `webglNativeMaterialTextureFallbackReason`
- WebGL native mesh path binds a deterministic 1x1 placeholder texture on the first texture-ready frame.
- In browser hosts with `Image`, URI/data-url texture refs are decoded asynchronously and uploaded on a later frame.
- WebGL sampler parameters map `wrapS`, `wrapT`, `minFilter`, and `magFilter` onto native texture parameters.
- Upload/cache diagnostics report placeholder uploads, decoded-image uploads, cache hits, and cache misses.
- Decode failure diagnostics report image-load failures while keeping placeholder binding active.
- Adapters should keep existing sampled-color fallback until WebGL/WebGPU texture binding diagnostics prove visual parity.

## Required Diagnostics

Resource APIs must report decode failure, fallback backend, compression support, residency pressure, and upload budget decisions without using industry-specific names.

## Scenario Coverage Target

This API family must support playground scenarios S1, S3, S4, S5, S7, S8, S9, S10, and S11 through app-owned adapters.
