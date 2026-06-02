# Runtime World API（`engine.runtime.world.*`）

受众：foundation/runtime world 集成者与编排工具链。

## 范围

本页定义 Batch-2 首批冻结的 runtime world foundation 接口。

## 接口

### engine.runtime.world.compileFromDocument(input)

级别：`foundation`
稳定性：`beta`

```ts
engine.runtime.world.compileFromDocument(input: {
  snapshot: EngineDocumentSnapshot;
}): {
  worldRevision: number;
  entities: readonly EngineRuntimeEntity[];
}
```

错误码：

- `ENGINE_WORLD_NOT_COMPILED`

确定性约束：

- 相同输入快照必须生成一致 worldRevision 与实体顺序。

### engine.runtime.world.getWorldSnapshot()

级别：`foundation`
稳定性：`beta`

```ts
engine.runtime.world.getWorldSnapshot(): {
  worldRevision: number;
  entities: readonly EngineRuntimeEntity[];
}
```

错误码：

- `ENGINE_WORLD_NOT_COMPILED`

确定性约束：

- 相同编译输入 revision 必须产生相同顺序的实体快照输出。

### engine.runtime.world.queryEntity(input)

级别：`foundation`
稳定性：`beta`

```ts
engine.runtime.world.queryEntity(input: {
  entityId: string;
}): {
  found: boolean;
  entity: EngineRuntimeEntity | null;
}
```

错误码：

- `ENGINE_WORLD_NOT_COMPILED`

确定性约束：

- 相同 world snapshot 与相同实体 id 必须返回一致查询结果。

### engine.runtime.world.queryComponent(input)

级别：`foundation`
稳定性：`beta`

```ts
engine.runtime.world.queryComponent(input: {
  component: "transform" | "geometry" | "material" | "visibility" | "picking";
}): {
  entityIds: readonly string[];
}
```

错误码：

- `ENGINE_WORLD_NOT_COMPILED`

确定性约束：

- 相同 world snapshot 与相同 component key 必须返回一致实体 id 顺序。

### engine.runtime.world.getGraphStats()

级别：`foundation`
稳定性：`beta`

```ts
engine.runtime.world.getGraphStats(): {
  worldRevision: number;
  entityCount: number;
}
```

错误码：

- `ENGINE_WORLD_NOT_COMPILED`

确定性约束：

- 相同 world snapshot 必须产生一致的 `worldRevision` 与 `entityCount`。

### engine.runtime.world.clear()

级别：`foundation`
稳定性：`beta`

```ts
engine.runtime.world.clear(): {
  clearedEntityCount: number;
}
```

错误码：

- `ENGINE_WORLD_NOT_COMPILED`

确定性约束：

- 相同清理前 world 状态必须产生一致 `clearedEntityCount`。

## 关联契约

- `packages/engine/src/runtime/world/runtime-world.foundation.contract.ts`
- `packages/engine/src/scene-runtime/runtimeWorld/runtimeWorld.contract.ts`
- `packages/engine/src/ecs/runtimeWorld.ts`

## 兼容 Runtime Helpers

这些 helpers 会作为兼容别名继续保留。新的 adapter 代码应优先使用 [Runtime Navigation And Collision API](runtime-navigation-collision.md) 中定义的 canonical `engine.runtime.navigation.*` 与 `engine.runtime.collision.*`。

### engine.runtime.world.setOpenWorldMap(map)

兼容迁移建议：

- 当 adapter 只需要 collider/obstacle 状态时，使用 `engine.runtime.collision.setObstacles(obstacles)`。
- map/domain size 语义应尽量保留在 adapter。

```ts
engine.runtime.world.setOpenWorldMap(map: {
  mapSize: number;
  obstacles: readonly Array<{
    id: string;
    x: number;
    z: number;
    width: number;
    depth: number;
  }>;
}): {
  mapSize: number;
  obstacles: readonly Array<{ id: string; x: number; z: number; width: number; depth: number }>;
}
```

### engine.runtime.world.getOpenWorldMap()

```ts
engine.runtime.world.getOpenWorldMap(): {
  mapSize: number;
  obstacles: readonly Array<{ id: string; x: number; z: number; width: number; depth: number }>;
}
```

### engine.runtime.world.setAgents(agents) / getAgents()

兼容迁移建议：

- 使用 `engine.runtime.navigation.setAgents(agents)` 与 `engine.runtime.navigation.getAgents()`。

```ts
type Agent = {
  id: string;
  kind: "car" | "pedestrian";
  x: number;
  z: number;
  yaw: number;
  pathIndex: number;
  speed: number;
};
```

### engine.runtime.world.stepAgents(input)

兼容迁移建议：

- raw per-step paths 使用 `engine.runtime.navigation.stepAgents(input)`。
- reusable registered paths 使用 `engine.runtime.navigation.registerPath(...)` 加 `stepPathAgents(...)`。

```ts
engine.runtime.world.stepAgents(input: {
  deltaSeconds: number;
  carPath: readonly Array<{ x: number; z: number }>;
  pedestrianPath: readonly Array<{ x: number; z: number }>;
}): readonly Agent[];
```

### engine.runtime.world.resolveCollision(input)

兼容迁移建议：

- 使用 `engine.runtime.collision.resolve(input)`。
- 需要更完整 collision orchestration 时，使用 `registerCollider(...)`、`queryAabb(...)` 与 `evaluateTriggers(...)`。

```ts
engine.runtime.world.resolveCollision(input: {
  x: number;
  z: number;
  radius: number;
  velocityX?: number;
  velocityZ?: number;
}): {
  x: number;
  z: number;
  velocityX: number;
  velocityZ: number;
  collided: boolean;
}
```
