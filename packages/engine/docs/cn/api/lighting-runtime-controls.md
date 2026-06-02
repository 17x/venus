# Lighting Runtime 控制

该 API 提供面向多场景、语义中立的 3D 运行时光照控制契约。

## 命名空间

- `engine.runtime.lighting`

## 方法

### `engine.runtime.lighting.setCollection(collection)`

替换当前运行时光照集合。

```ts
engine.runtime.lighting.setCollection({
  lights: [
    {
      id: "key",
      type: "directional",
      color: "#ffffff",
      intensity: 1.1,
      targetX: 0,
      targetY: 0,
      targetZ: 0,
    },
    { id: "ambient", type: "ambient", color: "#f8fafc", intensity: 0.2 },
  ],
});
```

### `engine.runtime.lighting.getCollection()`

读取当前运行时光照集合。

### `engine.runtime.lighting.clearCollection()`

清空当前运行时光照集合。

### `engine.runtime.lighting.applyProfile(profile)`

应用内置 profile：

- `studio`
- `editor`
- `gameplay`

### `engine.runtime.lighting.resolveEnvironment(input)`

在不改变当前光照集合的前提下，解析确定性的环境光照输出。

### `engine.runtime.lighting.applyEnvironment(input)`

解析确定性的环境光照输出，并将结果应用为当前运行时光照集合。

```ts
engine.runtime.lighting.applyEnvironment({
  timeOfDayHours: 14.5,
  directionDeg: 35,
  cloudCover: 0.4,
  precipitation: 0.1,
  fogDensity: 0.05,
  directionalIntensity: 1.1,
  ambientIntensity: 0.25,
  additionalLights: [],
});
```

## Native Mesh Shading

当前光照集合会进入 native mesh frame payload。WebGL native mesh presenter 会在提交 draw color 前执行确定性的 per-mesh shading：

- `ambient` light 提供均匀颜色贡献。
- `hemisphere` light 根据 mesh surface normal 混合 sky/ground color。
- `directional` light 使用 light target vector 与 mesh surface normal。
- `point` 与 `spot` light 使用 mesh center distance、decay、range 与 surface direction。

Playground browser parity 会对 driving game 与 3D editor route 比较 lighting enabled/disabled 的 canvas screenshot。S10 game route 将路灯保留为通用 `point` entity，使附近 surface 产生可见变化，同时不向 engine API 引入 game-specific 命名。

## 边界规则

- 领域语义保留在 app/runtime adapter 层。
- engine 只接受通用光照实体与通用 profile token。
- 光照 API 属于 runtime orchestration 控制，不承载产品工作流语义。
