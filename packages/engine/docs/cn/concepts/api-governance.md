# API 治理规则

本文定义 `@venus/engine` 公共 API 的强制治理规范。

## 1. 命名空间治理

公共命名空间只允许：

- `engine.*`
- `engine.runtime.*`
- `engine.capability.*`
- `engine.events.*`

其他任何公共命名空间都应被策略拒绝。

## 2. 语义边界

Engine API 必须保持能力导向。
产品语义必须停留在 app/domain adapter。

应拒绝的命名示例：

- `engine.medical.*`
- `engine.bim.*`
- `engine.gis.*`

可接受命名示例：

- `engine.capability.field.*`
- `engine.capability.geo.*`
- `engine.capability.timeline.*`

## 3. Runtime 命名空间治理

Runtime API 必须暴露 generic、3D-first 的执行概念。

Canonical runtime 命名空间：

- `engine.runtime.navigation.*`：generic agents、waypoint paths、path constraints 与确定性 stepping。
- `engine.runtime.collision.*`：generic obstacles、colliders、broadphase queries、trigger events 与 collision resolution。
- `engine.runtime.world.*`：compiled world/document foundation APIs。

`engine.runtime.world.*` 下可以保留兼容别名用于迁移；但只要已有 canonical namespace，新场景 adapter 必须使用 canonical namespace。

应拒绝的 runtime API 模式：

- `engine.runtime.game.*`
- `engine.runtime.vehicle.*`
- `engine.runtime.city.*`
- `engine.runtime.navigation.pedestrianTrafficRules`
- `engine.runtime.collision.roadBlocker`
- 2D 专属 runtime movement 或 collision 命名

Runtime API 晋升 checklist：

- API payload 保持产品语义中立与 3D-first。
- API 进入 `stable` 时必须同步更新 capability registry stability。
- EN/CN API 文档与 migration 文档必须一起更新。
- Contract tests 必须覆盖确定性行为；若保留兼容别名，也必须覆盖 alias parity。

## 4. API 变更流程

1. 先定义或更新 contract。
2. 在同一变更中同步更新 EN/CN 文档。
3. 增补 contract 测试。
4. 若行为可观测，补充事件说明。
5. 通过质量门禁后再合并。

## 5. 必要 PR 门禁

- Contract 覆盖门禁
- EN/CN 同构一致性门禁
- API 文档覆盖门禁
- 命名空间策略门禁
- 确定性门禁（timeline/simulation/replay）

## 6. 破坏性变更策略

以下变化均视为 breaking change：

- 签名变化
- 必填参数变化
- 返回结构变化
- 错误行为变化
- 事件发射顺序语义变化

breaking change 必须包含：

- 主版本升级目标
- 迁移指南条目
- 明确的 changelog 说明
