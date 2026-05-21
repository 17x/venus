# 后端能力矩阵

本文档定义不同后端实现之间的能力差异与运行约束。

## 后端档位

- WebGPU：高性能优先后端，支持显式资源与同步控制。
- WebGL：兼容性优先后端，显式控制能力较弱。
- Canvas2D：平面渲染与兼容回退后端。
- Headless：用于 CI、快照、回放的确定性离屏后端。

## 能力矩阵

| 能力项                | WebGPU | WebGL | Canvas2D | Headless           |
| --------------------- | ------ | ----- | -------- | ------------------ |
| 显式 GPU 资源生命周期 | 完整   | 部分  | 无       | 依 profile         |
| 屏障规划              | 完整   | 模拟  | 无       | 依 profile         |
| 命令缓冲可观测性      | 完整   | 部分  | 有限     | 完整（元数据优先） |
| Ray Picking 一致性    | 完整   | 完整  | 部分     | 完整               |
| Overlay 渲染          | 完整   | 完整  | 完整     | 完整               |
| 确定性回放支持        | 完整   | 完整  | 部分     | 完整               |
| 回读吞吐              | 高     | 中    | 低       | 中                 |
| Shader 变体控制       | 完整   | 部分  | 无       | N/A                |

## 选择策略

1. 浏览器运行时默认偏好顺序：

- `webgpu`
- `webgl`
- `canvas2d`

2. CI 与回归验证场景：

- 需要确定性输出时优先 `headless`。

3. 后端回退切换必须发射：

- `engine.render.backendSwitched`
- diagnostics fallback trace 元数据

## 行为差异说明

### WebGPU

- 支持显式 upload batch 与 barrier plan。
- 适用于大场景吞吐与高级诊断场景。

### WebGL

- 兼容性高，但显式调度可见性较弱。
- 高级操作必须先做 capability probe。

### Canvas2D

- 主要用于平面能力与兼容路径。
- 不适合 GPU-explicit 工作流。

### Headless

- 优先保证确定性输出而非峰值吞吐。
- 必须输出 frame 元数据与 replay 契约。

## 错误与恢复建议

常见后端错误码：

- `E_BACKEND_UNAVAILABLE`
- `E_UNSUPPORTED_CAPABILITY`
- `E_OPERATION_TIMEOUT`

恢复流程：

1. 探测能力档位。
2. 按策略降级能力使用。
3. 切换到兼容后端重试。
4. 输出完整 diagnostics 事件链便于追踪。
