# App Adapter 迁移指南

本文说明 app/domain adapter 如何迁移到 canonical engine API 能力面。

## 迁移目标

从 compat 导向接入迁移到 capability 导向接入，并确保产品语义不泄漏到 engine API。

## 迁移步骤

1. 盘点现有 adapter 调用

- 列出所有 engine 接触点。
- 标记 compat-only API。

2. 映射到 canonical 命名空间

- `engine.*`：默认业务接入层。
- `engine.capability.*`：能力组合层。
- `engine.runtime.*`：仅在必须底层控制时使用。

3. 归一化产品输入

- 将领域模型转换为规范 graph。
- 将交互状态转换为 overlay/annotation/transform-preview payload。

4. 替换 compat 别名

- 移除临时别名与 legacy 直接依赖。
- 校验导入全部落到 canonical surface。

5. 对齐事件处理

- 用类型化事件订阅替换临时回调。
- 错误链路必须订阅 diagnostics 事件。

6. 校验确定性链路

- 在目标后端 profile 下验证 timeline/simulation/replay 行为。

## 映射示例

| 旧模式                       | 新模式                                |
| ---------------------------- | ------------------------------------- |
| `compat.setScene(data)`      | `engine.setGraph(graph)`              |
| `compat.patchScene(delta)`   | `engine.updateGraph(patch)`           |
| `compat.hitTest(point)`      | `engine.pick(point, options)`         |
| `compat.previewTransform(p)` | `engine.setTransformPreview(preview)` |

## 必需回归覆盖

1. Hover/Selection 视觉一致性。
2. 跨后端 Overlay 一致性。
3. Picking 顺序确定性。
4. Headless 快照与回放一致性。

## Canonical 就绪标准

- adapter runtime 不再导入 compat-only 模块。
- adapter 调用全部通过 canonical API。
- EN/CN 文档与测试与最终调用面一致。
