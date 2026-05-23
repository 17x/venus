# API 暴露治理

## 目的

本治理用于约束 engine 能力的对外暴露方式：

- 仅 API-first
- 仅简洁命名
- 仅语义中立

## 暴露策略

- 对外使用必须通过受治理的 engine API 面。
- 禁止将深层内部模块作为公共集成入口。
- 禁止在顶层 barrel 增加临时 helper 导出。
- 运行时能力必须以稳定可调用 API 形式暴露。

## 命名策略

- 名称必须简短且意图清晰。
- 优先使用一个动词 + 一个领域名词。
- 禁止产品语义、行业语义、业务流程语义命名。
- 避免冗余前缀与含义不清的缩写。

示例：

- 推荐：planFrame、pick、raycast、getStats、startTrace
- 避免：runMedicalWorkflowPlanner、executeBusinessReviewFlow

## API 形态策略

- 优先小而内聚的 API 组。
- 方法名应跨场景保持稳定。
- 不同场景应复用同一组基础原语契约。
- 新增 API 需要同步契约文档与 capability map。

描述符对齐策略：

- Runtime foundation 描述符与对外可观测诊断字段必须与 capability-map 和概念文档保持一致。
- 描述符新增必须在同一变更切片同步 EN/CN 文档。
- 描述符重命名或删除必须附带迁移说明或显式兼容性理由。

## 导出策略

- 顶层 barrel 导出必须限定在五层根目录内。
- 测试或诊断 helper 导出必须记录显式例外。
- 禁止 legacy 与迁移过渡路径导出。

当前显式导出例外：

- ./testing/createTestSurface

2D 显式导出门禁：

- 2D 相关导出仅允许用于显式 opt-in 的集成接口。
- 默认运行时路径不得要求 2D 集成 hooks。

## 评审清单

- 是否位于受治理 API 面？
- 命名是否简洁且语义中立？
- 是否避免了产品/业务语义？
- 是否应复用已有 API 而非新增？
- 是否同步了 capability-map 与文档覆盖？
- 若描述符字段发生变化，是否同步更新 EN/CN 描述符文档与契约测试？
