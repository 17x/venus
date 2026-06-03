# Runtime Navigation And Collision API

该 API 为 3D runtime 场景提供语义中立的移动与碰撞编排能力。

## 命名空间

- `engine.runtime.navigation`
- `engine.runtime.collision`

稳定性：`stable`

## Navigation

### `engine.runtime.navigation.setAgents(agents)`

替换当前 navigation agent 集合。

```ts
engine.runtime.navigation.setAgents([
  { id: "agent-a", kind: "car", x: 0, z: 0, yaw: 0, pathIndex: 0, speed: 4 },
]);
```

### `engine.runtime.navigation.getAgents()`

读取当前 navigation agent 快照。

### `engine.runtime.navigation.registerPath(path)`

注册或替换一个 waypoint path。

```ts
engine.runtime.navigation.registerPath({
  id: "path-east",
  loop: true,
  nodes: [
    { x: 0, z: 0 },
    { x: 100, z: 0 },
  ],
  constraints: {
    arrivalTolerance: 0.5,
    maxStepDistance: 2,
  },
});
```

Path constraints 是可选项：

- `arrivalTolerance` 控制 agent 距离 waypoint 多近时推进到下一个 waypoint。
- `maxStepDistance` 限制 agent 单次 step 最多移动多远。
- `loop: false` 表示 agent 到达最终 waypoint 后停止，而不是回绕到 node `0`。

### `engine.runtime.navigation.unregisterPath(pathId)`

按 id 移除一个已注册 path，并返回 `{ removed, pathCount }`。

### `engine.runtime.navigation.getPaths()`

按确定性顺序读取已注册 navigation paths。

### `engine.runtime.navigation.stepAgents(input)`

沿确定性的 waypoint path 推进当前 agents。

```ts
engine.runtime.navigation.stepAgents({
  deltaSeconds: 1 / 60,
  carPath: [
    { x: 0, z: 0 },
    { x: 100, z: 0 },
  ],
  pedestrianPath: [
    { x: 0, z: 0 },
    { x: 0, z: 100 },
  ],
});
```

### `engine.runtime.navigation.stepPathAgents(input)`

使用已注册 paths 和可选的 agent-to-path bindings 推进当前 agents。

```ts
engine.runtime.navigation.stepPathAgents({
  deltaSeconds: 1 / 60,
  pathBindings: [{ agentId: "agent-a", pathId: "path-east" }],
});
```

## Collision

### `engine.runtime.collision.registerCollider(collider)`

注册或替换一个 active collision registry 中的 collider。

```ts
engine.runtime.collision.registerCollider({
  id: "blocker-a",
  x: 0,
  z: 0,
  width: 40,
  depth: 40,
});
```

### `engine.runtime.collision.unregisterCollider(colliderId)`

按 id 移除一个 collider，并返回 `{ removed, colliderCount }`。

### `engine.runtime.collision.setObstacles(obstacles)`

替换当前 collision obstacle 集合。

```ts
engine.runtime.collision.setObstacles([
  { id: "blocker-a", x: 0, z: 0, width: 40, depth: 40 },
]);
```

### `engine.runtime.collision.getObstacles()`

读取当前 collision obstacle 快照。

### `engine.runtime.collision.queryAabb(input)`

基于当前 collider registry 执行确定性的 broadphase AABB 查询。

```ts
engine.runtime.collision.queryAabb({
  x: 0,
  z: 0,
  width: 64,
  depth: 64,
});
```

### `engine.runtime.collision.evaluateTriggers(input)`

基于当前 collider registry，为一个 subject 计算确定性的 trigger events。
该方法返回 `enter`、`stay`、`exit` 事件；当本次产生至少一个 trigger event 时，
会同步发出 `engine.collision.trigger` 事件。

```ts
engine.runtime.collision.evaluateTriggers({
  subjectId: "subject-a",
  x: 0,
  z: 0,
  radius: 5,
});
```

### `engine.runtime.collision.sweepCircle(input)`

将一个移动 circle 从起点中心扫到目标中心，并与当前 active colliders 做连续碰撞检测。
该方法返回最早接触、归一化 impact time、接触法线、impact center 与安全终点。
当单帧位移可能直接穿过较薄 collider，导致离散 `resolve` 尚未观察到 overlap 时，使用该 API。

```ts
engine.runtime.collision.sweepCircle({
  startX: 0,
  startZ: 0,
  endX: 50,
  endZ: 0,
  radius: 2,
});
```

### `engine.runtime.collision.resolve(input)`

基于当前 obstacles 执行一次 circle-vs-AABB 碰撞求解。

```ts
engine.runtime.collision.resolve({
  x: 1,
  z: 1,
  radius: 5,
  velocityX: 10,
  velocityZ: 0,
});
```

## 兼容性

旧的 `engine.runtime.world.setAgents`、`stepAgents`、`resolveCollision` 暂时保留为兼容入口。新代码应优先使用更明确的 navigation/collision 命名空间。

## 边界规则

- API 命名保持产品语义中立。
- game、city、vehicle、pedestrian 等场景标签留在 app adapter 层。
- Engine 只处理 generic agents、waypoint paths、obstacles 与 collision inputs。
