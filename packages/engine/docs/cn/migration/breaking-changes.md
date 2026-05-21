# Breaking Changes 策略与清单

本文定义什么属于 breaking change，以及必须如何记录和交付。

## Breaking Change 分类

1. 签名变化

- 函数名变化
- 参数名称或必填属性变化

2. 契约变化

- 返回结构变化
- 错误码语义变化
- 确定性约束变化

3. 事件变化

- 事件名变化
- payload 字段移除或重命名
- 事件顺序契约变化

4. 行为变化

- 后端回退策略变化
- 默认质量策略变化

## Breaking Change 必需产物

每个 breaking change 必须包含：

- 本文档中的迁移记录
- adapter 迁移指南更新
- EN/CN API 文档同步更新
- contract 与回归测试同步更新
- changelog 明确影响范围

## 发布纪律

- breaking change 仅允许在主版本发布。
- 次版本只允许兼容性新增（可选字段/新增 API）。
- patch 版本不得改变公共语义。

## 当前清单模板

每个批准的 breaking change 使用下表登记：

| 版本    | 领域         | 变更内容              | 影响             | 迁移动作         | 状态    |
| ------- | ------------ | --------------------- | ---------------- | ---------------- | ------- |
| `canonical` | API 命名空间 | 移除 compat-only 别名 | Adapter 编译错误 | 更新导入与调用点 | Planned |

## 验收检查清单

1. EN/CN 文档在同一 PR 更新。
2. runtime/capability 测试同步更新。
3. 事件 payload 一致性校验通过。
4. 补充 adapter 迁移示例。
