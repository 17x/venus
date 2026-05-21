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

## 3. API 变更流程

1. 先定义或更新 contract。
2. 在同一变更中同步更新 EN/CN 文档。
3. 增补 contract 测试。
4. 若行为可观测，补充事件说明。
5. 通过质量门禁后再合并。

## 4. 必要 PR 门禁

- Contract 覆盖门禁
- EN/CN 同构一致性门禁
- API 文档覆盖门禁
- 命名空间策略门禁
- 确定性门禁（timeline/simulation/replay）

## 5. 破坏性变更策略

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
