# Runtime Constraints API

实验性的 `engine.runtime.constraints` 命名空间用于把候选 3D 位置或标量投影到语义中立的
可行域。Constraint 不负责产生运动；输入、动画、AI 或产品 Adapter 必须先提供候选状态。

稳定性：`experimental`

## 已支持 Primitive

- `line`、`segment`、`plane`、`circle`、`polyline`
- `scalar-range`
- `angle-range`：单位为弧度，支持跨越 `-PI/PI` 接缝的区间

## Registry

### `engine.runtime.constraints.register(set)`

注册或替换一个 constraint set。规则先按 `priority` 降序执行，同优先级保持声明顺序。
空 set id 会抛出异常。

### `engine.runtime.constraints.unregister(setId)`

返回 `{ removed, constraintSetCount }`。

### `engine.runtime.constraints.get(setId)`

返回已注册 set；不存在时返回 `null`。

### `engine.runtime.constraints.getAll()`

按确定性注册顺序返回全部 sets。

## Resolve

### `engine.runtime.constraints.resolve(input)`

在不修改 scene graph 的情况下投影一个临时候选状态。

```ts
engine.runtime.constraints.register({
  id: "ring",
  rules: [{
    constraint: {
      id: "ring-surface",
      kind: "circle",
      center: { x: 0, y: 0, z: 0 },
      normal: { x: 0, y: 0, z: 1 },
      radius: 10,
    },
  }],
});

const result = engine.runtime.constraints.resolve({
  constraintSetId: "ring",
  candidate: { position: { x: 20, y: 0, z: 5 } },
});
```

返回结构包含：

- `status`：`satisfied`、`corrected` 或 `unsatisfied`
- 已求解的 `pose` 与可选 `scalar`
- `correctionDistance`
- 确定性 `activeConstraintIds`
- 结构化 `violations`
- 有界 `iterations`

## 错误与恢复

- set 不存在：返回 `unsatisfied` 与 `missing-constraint-set`。
- 几何退化：返回 `unsatisfied` 与 `degenerate-geometry`。
- 标量规则缺少标量输入：返回 `unsatisfied` 与 `missing-scalar`。
- 可修正候选返回 `corrected` 与 `outside-tolerance` 诊断。

## 确定性与预算

相同的规范化 set 与候选输入必须产生相同结果。P0 求解只对规则执行一次有界遍历。
Entity binding、replay 集成、debug geometry 与迭代关系求解尚不属于当前实验切片。

## Adapter 边界

2D Adapter 使用 3D plane/circle 表达平面行为，再把通用求解点转换回文档状态。
Game 或 simulation Adapter 先产生期望运动，再应用 Constraint 与 Collision。
产品语义必须留在 Engine 外部。

Runtime navigation 同样遵守该分层：path driver 先产生期望位置，再使用通用 active-segment
Constraint 修正路径漂移，最后提交状态。
