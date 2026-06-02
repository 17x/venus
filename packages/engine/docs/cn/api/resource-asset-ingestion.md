# 资源与资产接入 API

状态：Release contract draft。
范围：ENG-004。

Engine 的资源接入必须保持通用。App adapter 在提交前把领域文件转换成 engine resources。

## 通用资源族

- Geometry resources：mesh、primitive、polyline、point cloud、volume slice payload。
- Material resources：color、texture reference、transparency、render flags。
- Texture resources：image source、decode state、compression state、residency state。
- Animation resources：keyframe tracks、deterministic revision ids、playback ranges。
- Volume resources：scalar fields、slice descriptors、transfer function handles。

## Graph Material Texture 契约

`engine.setGraph(input)` 支持 graph-level `materials` 与 mesh-level `uvs`，因此场景 adapter 可以提交真正的 material/texture contract，而不需要把 sampled colors 烘焙成大量小 primitive。

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

当前状态：

- Graph contract、公共类型、material texture refs、sampler descriptors 与 mesh UV payloads 已支持。
- WebGL native mesh diagnostics 会暴露 material texture readiness：
  - `webglNativeMaterialTextureCandidateCount`
  - `webglNativeMaterialTextureUvReadyCount`
  - `webglNativeMaterialTextureBindingCount`
  - `webglNativeMaterialTextureUploadBytes`
  - `webglNativeMaterialTextureCacheHitCount`
  - `webglNativeMaterialTextureCacheMissCount`
  - `webglNativeMaterialTextureDecodeFailureCount`
  - `webglNativeMaterialTextureDecodeFailureReason`
  - `webglNativeMaterialTextureFallbackReason`
- WebGL native mesh path 会在 texture-ready 的第一帧绑定确定性的 1x1 placeholder texture。
- 在具备 `Image` 的浏览器 host 中，URI/data-url texture refs 会异步 decode，并在后续帧上传。
- WebGL sampler parameters 会把 `wrapS`、`wrapT`、`minFilter` 与 `magFilter` 映射到 native texture parameters。
- Upload/cache diagnostics 会报告 placeholder uploads、decoded-image uploads、cache hits 与 cache misses。
- Decode failure diagnostics 会报告 image-load failures，同时保持 placeholder binding 继续可用。
- 在 WebGL/WebGPU texture binding diagnostics 证明视觉一致前，adapter 应继续保留现有 sampled-color fallback。

## 必须提供的诊断

Resource API 必须报告 decode failure、fallback backend、compression support、residency pressure、upload budget decisions，并且不能使用行业专有名称。

## 场景覆盖目标

该 API family 必须通过 app-owned adapters 支撑 playground S1、S3、S4、S5、S7、S8、S9、S10、S11。
