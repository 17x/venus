# API 总览

本页定义官方 API 分层，以及每层应承担的职责。

## 分层定义

1. Developer API（`engine.*`）

- 面向业务应用与 adapter 接入。
- 要求简洁、稳定、易理解。

2. Runtime API（`engine.runtime.*`）

- 面向高级控制、诊断、后端一致性验证与执行级工具。
- 可公开，但不作为默认接入层。

3. Capability API（`engine.capability.*`）

- 面向场景无关能力包组合。
- 必须剥离产品和行业语义。

4. Event API（`engine.events.*` 与事件域）

- 负责订阅模型与事件 payload 契约。

## 契约基线

每个 API 条目必须文档化以下字段：

- `stability`：`experimental` | `beta` | `stable`
- `level`：`developer` | `advanced` | `foundation`
- 参数与约束
- 返回值
- 错误码
- 确定性约束（如适用）
- 关联事件

## 错误模型

标准错误包络：

```ts
interface EngineApiError {
  code: string;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}
```

通用错误码：

- `E_INVALID_ARGUMENT`
- `E_SCHEMA_VALIDATION_FAILED`
- `E_RESOURCE_NOT_FOUND`
- `E_BACKEND_UNAVAILABLE`
- `E_BUDGET_EXCEEDED`
- `E_OPERATION_TIMEOUT`
- `E_UNSUPPORTED_CAPABILITY`
- `E_INTERNAL_INVARIANT_BROKEN`

## 参数文档规则

每个参数项必须包含：

- 名称
- 类型
- 是否必填
- 默认值（如可选）
- 合法范围或枚举
- 副作用

## API 治理说明

治理规则见 [API 治理](../concepts/api-governance.md)，包含：

- 命名空间限制
- 语义剥离流程
- 文档与测试门禁
