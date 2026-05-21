# M1 目标期望定义（可验收）

目标范围：

1. editor-primitive 类型复用优先。
2. Product 本地只保留语义契约，不重复维护底层机制类型。
3. 高频交互链路具备单测与回归可观测性。

## 1. 类型与契约目标

1. 类型继承策略

- 优先从 @venus/editor-primitive 继承已稳定类型（例如 PointerSelectorModifiers、ControlDragBehavior）。
- 本地仅定义 product 语义附加类型（例如 ShapeStyleHandleDrag）。

2. 契约收敛目标

- 同一语义只保留一个解析入口。
- 禁止在 pointerdown/pointermove 等多处重复解析同一 payload。

验收标准：

1. 重复解析逻辑归并到单一模块。
2. 至少 1 处状态类型由 editor-primitive 类型替代本地重复定义。

## 2. 行为目标

1. 样式控制拖拽行为

- rect-radius 与 arc-angle 在 pointerdown/pointermove 路径中解析一致。
- 非法 payload 与不支持 drag kind 明确返回 null。

验收标准：

1. 四类测试覆盖：rect-radius、arc-angle、非法 payload、不支持 kind。
2. 交互链路无类型回退为 any/unknown 扩散。

## 3. 测试目标

1. 单测

- 新增纯函数解析器单测，覆盖正反路径。

2. 编译

- vector-editor-web TypeScript 编译通过。

验收标准：

1. `node --test` 目标测试通过。
2. `tsc -p tsconfig.app.json --noEmit` 通过。

## 4. 对 Engine 的期望边界

1. Product 不直接依赖 engine 包。
2. Product 通过 runtime bridge 消费 engine 能力。
3. 若 bridge 无法满足 M1 能力需求，必须形成显式缺口清单并回传 engine。

验收标准：

1. 缺口清单具有“用途、优先级、替代方案、阻断影响”四要素。

## 5. 当前完成度（2026-05-21）

1. 已达成：类型继承与语义契约收敛

- `PointerSelectorModifiers`、`ControlDragBehavior` 已按 editor-primitive 优先复用。
- 样式控制拖拽解析已收敛到单一入口，pointerdown/pointermove 共用解析器。

2. 已达成：行为一致性

- rect-radius 与 arc-angle 解析行为在 down/move 路径一致。
- 非法 payload 与不支持 kind 均稳定返回 null。

3. 已达成：测试与编译验收

- 指定 node:test 用例通过（解析器行为、pointer 生命周期、状态切换策略）。
- `tsc -p tsconfig.app.json --noEmit` 通过。

4. 已达成：Engine 缺口回传机制

- M1 缺口清单已形成并写入 `ai/operations/vector-m1-engine-method-gap-list-2026-05-21.md`。

5. 已达成：命中优先级策略收敛（T3）

- 对象/控制点/overlay 命中优先级已形成显式策略模块并接入 pointerdown/pointermove。
- marquee 阶段 overlay 独占 pointer-move 命中通道，非 marquee 阶段控制点优先于对象命中。
- 命中策略行为测试与编译验收已通过。

6. 已达成：选择过滤条件统一（T4）

- click/marquee/cycle-hit/hover 统一经过同一选择过滤策略入口。
- 隔离模式下命中候选统一按 interactionDocument allow-list 过滤，避免越界命中。
- 过滤策略已预留锁定/隐藏谓词注入位，满足后续 runtime 元数据接入扩展。

7. 已达成：预览态/提交态一致性（T5）

- pointer-up 已接入统一预览清理策略，覆盖“无提交命令”和“无会话残留预览”边界。
- 有 transform 命令时维持 commit-pending 同步清理；无命令时立即清理，避免“画面变化但文档未提交”视觉残留。
- 对应策略测试、既有交互回归测试与 TypeScript 编译均通过。

8. 已达成：吸附与辅助线稳定化（T6）

- 吸附启用/禁用规则已统一（用户开关 + 大场景自动禁用）。
- move snapping 阈值按缩放计算并钳制，保障不同缩放级别下触发一致性。
- 辅助线可视化规则已统一到策略模块，degraded 模式下与吸附结果保持一致且可解释。

9. 已达成：M1 性能基线（T7）

- 已提供可复现的 P50/P95 基线聚合脚本与 package 快捷命令。
- small/medium/large 场景基线已落盘到 `docs/product-requirements/m1-performance-baseline.json`。
- 基线产物与现有 perf gate 配置兼容，可直接用于后续回归对比。

10. 已达成：诊断字段与日志规范（T8）

- 关键字段已统一：命中候选数、提交耗时、回滚次数（含回滚原因）。
- 关键路径（pointer-down/move/up/leave + cycle-hit）已接入统一诊断日志器。
- 完整率指标已建立并可计算（`completenessRatio`），用于验收“关键路径日志完整率 >= 95%”。
- 统一日志前缀已建立：`[runtime-interaction-diagnostic]`，支持快速检索与归因定位。

11. 已达成：核心链路回归清单（T9）

- 已建立 10 条核心链路回归用例清单并编号（R1-R10），覆盖 pointer 生命周期、命中/选择、变换提交、吸附、诊断、输入归一化等主链路。
- 已提供一键执行脚本 `pnpm regression:m1-core`，保证每次迭代均可执行。
- 回归输出统一包含 `[PASS]/[FAIL] + 编号 + 名称 + 汇总`，支持持续追踪与 CI 接入。

12. 已达成：M1 退出评审（T10）

- 已形成退出评审报告：`docs/product-requirements/m1-exit-review-report-2026-05-21.md`。
- 功能、性能、可靠性三类指标验收口径已统一，并附可复现命令。
- 退出结论：M1 可退出（文档与验收状态均已闭环）。
