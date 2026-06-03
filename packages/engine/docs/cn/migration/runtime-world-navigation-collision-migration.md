# Runtime World Navigation And Collision 迁移指南

本文定义 adapter 如何从旧的 `engine.runtime.world.*` movement/collision helper 迁移到 canonical stable navigation 与 collision 命名空间。

## 迁移目标

使用产品语义中立的 3D runtime API 处理移动与碰撞，并把场景语义留在 app adapter。

Canonical 命名空间：

- `engine.runtime.navigation.*`
- `engine.runtime.collision.*`

兼容别名：

- `engine.runtime.world.setAgents`
- `engine.runtime.world.getAgents`
- `engine.runtime.world.stepAgents`
- `engine.runtime.world.resolveCollision`

这些别名会继续保留用于兼容，但新代码不应使用它们。

## 映射关系

| 兼容 API                                              | Canonical API                                      |
| ----------------------------------------------------- | -------------------------------------------------- |
| `engine.runtime.world.setAgents(agents)`              | `engine.runtime.navigation.setAgents(agents)`      |
| `engine.runtime.world.getAgents()`                    | `engine.runtime.navigation.getAgents()`            |
| `engine.runtime.world.stepAgents(input)`              | `engine.runtime.navigation.stepAgents(input)`      |
| `engine.runtime.world.resolveCollision(input)`        | `engine.runtime.collision.resolve(input)`          |
| `engine.runtime.world.setOpenWorldMap({ obstacles })` | `engine.runtime.collision.setObstacles(obstacles)` |

## Registered Path 迁移

过去每帧传入 raw paths 的 adapter，可以先注册路径，再用 path binding 确定性推进 agents。

```ts
engine.runtime.navigation.registerPath({
  id: "main-path",
  loop: false,
  nodes: [
    { x: 0, z: 0 },
    { x: 20, z: 0 },
  ],
  constraints: {
    arrivalTolerance: 0.5,
    maxStepDistance: 2,
  },
});

engine.runtime.navigation.setAgents([
  { id: "agent-a", kind: "car", x: 0, z: 0, yaw: 0, pathIndex: 0, speed: 8 },
]);

engine.runtime.navigation.stepPathAgents({
  deltaSeconds: 1 / 60,
  pathBindings: [{ agentId: "agent-a", pathId: "main-path" }],
});
```

## Collision Registry 迁移

过去每帧替换全部 obstacles 的 adapter，如果对象是独立变化的，应优先使用 collider registry。

```ts
engine.runtime.collision.registerCollider({
  id: "building-a",
  x: 0,
  z: 0,
  width: 40,
  depth: 80,
});

const candidates = engine.runtime.collision.queryAabb({
  x: 0,
  z: 0,
  width: 64,
  depth: 64,
});
```

需要确定性的 enter/stay/exit trigger 语义时，使用 `evaluateTriggers`。

高速移动需要在离散 overlap 求解前先获得连续 circle-vs-collider 接触时，使用 `sweepCircle`。

## 边界规则

- game、city、vehicle、NPC、road、building、pedestrian 等标签必须留在 app adapter。
- Engine payload 使用 generic agents、paths、obstacles、colliders 与 trigger subjects。
- 不要向 engine runtime 引入 2D 专属移动或碰撞 API。
- Registered path constraints 必须保持数值化与确定性。
- 可观测 trigger events 必须同步写入文档并由 contract tests 覆盖。

## 就绪标准

- App adapter 直接调用 `engine.runtime.navigation.*` 与 `engine.runtime.collision.*`。
- 兼容别名仅用于旧接入或显式证明 alias parity 的测试。
- API 变化必须在同一变更中更新 EN/CN 文档和 contract tests。
- 场景 demo 暴露 diagnostics，说明当前使用 canonical navigation/collision。
