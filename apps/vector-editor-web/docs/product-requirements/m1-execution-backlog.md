# M1 执行任务清单（开工版）

目标：

1. 在保持 Product/Runtime 分层不变的前提下，完成核心交互链路稳定化与性能基线建设。

范围：

1. 模块 01 全量。
2. 模块 02 的变换/吸附主链路。
3. 模块 05 的命令桥与诊断基础。

## 任务分组

## G1：交互状态机与指针生命周期

T1. 统一 pointer 事件入口

- 优先级：P0
- Owner：Product Runtime 交互负责人
- 依赖：无
- 输出：统一 pointerdown/pointermove/pointerup 入口与状态流图
- 验收：

1. 无重复分叉入口导致的行为不一致
2. leave/ESC 中断后无残留临时态

T2. 显式化状态切换表

- 优先级：P0
- Owner：Product 交互负责人
- 依赖：T1
- 输出：状态切换矩阵（idle/hover/selecting/transforming/pathEditing/dragging）
- 验收：

1. 任意时刻只有一个主状态
2. 状态切换均可回放与解释

当前状态（2026-05-21）：

1. T1 已完成：pointer 生命周期守卫已落地，覆盖 pointerdown/pointermove/pointerup/pointerleave 核心路径。
2. T2 已完成：状态切换矩阵守卫策略已落地，关键切换入口统一经过 transition policy。
3. 验收已通过：
   - `node --test src/product/runtime/__tests__/runtimeEditingModeTransitionPolicy.test.ts`
   - `node --test src/product/runtime/canvasInteractionController/__tests__/pointerLifecycleState.test.ts`
   - `node --test src/product/runtime/canvasInteractionController/__tests__/shapeStyleDragResolverBehavior.test.ts`
   - `tsc -p tsconfig.app.json --noEmit`

## G2：命中与选择策略收敛

T3. 统一命中优先级策略

- 优先级：P0
- Owner：Runtime 命中策略负责人
- 依赖：T1
- 输出：命中优先级配置（对象/控制点/overlay）
- 验收：

1. 同上下文多次点击结果一致
2. 工具切换后命中规则可预测

当前状态（2026-05-21）：

1. T3 已完成：对象/控制点/overlay 命中优先级已抽象为统一策略，并接入 pointerdown/pointermove 主链路。
2. 工具切换一致性：selector 与 dselector 统一执行控制点优先；marquee 过程中 overlay 独占 pointer-move 命中通道。
3. 验收已通过：
   - `node --test src/product/runtime/__tests__/runtimeHitPriorityPolicyBehavior.test.ts`
   - `node --test src/product/runtime/__tests__/runtimeEditingModeTransitionPolicy.test.ts`
   - `node --test src/product/runtime/canvasInteractionController/__tests__/pointerLifecycleState.test.ts`
   - `node --test src/product/runtime/canvasInteractionController/__tests__/shapeStyleDragResolverBehavior.test.ts`
   - `tsc -p tsconfig.app.json --noEmit`

T4. 统一选择过滤条件

- 优先级：P0
- Owner：Product 选择策略负责人
- 依赖：T3
- 输出：锁定/隐藏/隔离态统一过滤规范
- 验收：

1. 图层面板和画布选择结果一致
2. 隔离模式下无越界命中

当前状态（2026-05-21）：

1. T4 已完成：选择过滤已统一到单一策略入口，覆盖 click/marquee/cycle-hit/hover 四条命中链路。
2. 隔离态一致性：所有上述链路统一按 interactionDocument 允许集过滤，消除隔离越界命中。
3. 锁定/隐藏扩展位：策略入口支持 isLocked/isHidden 谓词注入，后续可无侵入接入 runtime 元数据。
4. 验收已通过：
   - `node --test src/product/runtime/__tests__/runtimeSelectionFilterPolicyBehavior.test.ts`
   - `node --test src/product/runtime/__tests__/runtimeHitPriorityPolicyBehavior.test.ts`
   - `node --test src/product/runtime/__tests__/runtimeEditingModeTransitionPolicy.test.ts`
   - `node --test src/product/runtime/canvasInteractionController/__tests__/pointerLifecycleState.test.ts`
   - `node --test src/product/runtime/canvasInteractionController/__tests__/shapeStyleDragResolverBehavior.test.ts`
   - `tsc -p tsconfig.app.json --noEmit`

## G3：变换预览与提交一致性

T5. 预览态/提交态一致性修复

- 优先级：P0
- Owner：Runtime 变换负责人
- 依赖：T2
- 输出：变换会话规范（preview -> commit/cancel）
- 验收：

1. 不存在“画面变化但文档未提交”
2. cancel 后文档与历史一致

当前状态（2026-05-21）：

1. T5 已完成：pointer-up 提交路径增加预览清理一致性策略，覆盖“有会话无命令”和“无会话有残留预览”两类边界。
2. 预览/提交收敛：有 transform batch 命令时走 commit-pending 同步清理；无命令/无会话时立即清理预览，避免视觉残留与提交状态漂移。
3. 验收已通过：
   - `node --test src/product/runtime/__tests__/pointerReleaseCommitPolicy.test.ts`
   - `node --test src/product/runtime/__tests__/runtimeSelectionFilterPolicyBehavior.test.ts`
   - `node --test src/product/runtime/__tests__/runtimeHitPriorityPolicyBehavior.test.ts`
   - `node --test src/product/runtime/__tests__/runtimeEditingModeTransitionPolicy.test.ts`
   - `node --test src/product/runtime/canvasInteractionController/__tests__/pointerLifecycleState.test.ts`
   - `node --test src/product/runtime/canvasInteractionController/__tests__/shapeStyleDragResolverBehavior.test.ts`
   - `tsc -p tsconfig.app.json --noEmit`

T6. 吸附与辅助线行为稳定化

- 优先级：P1
- Owner：Runtime 吸附负责人
- 依赖：T5
- 输出：吸附阈值、禁用策略、可视化规则
- 验收：

1. 吸附触发可解释
2. 辅助线显示与吸附结果一致

当前状态（2026-05-21）：

1. T6 已完成：吸附禁用策略、吸附阈值策略、辅助线可视化策略已收敛到统一 policy 入口。
2. 阈值策略：move snapping 容差按 viewport scale 计算并做上下界钳制，缩放场景下吸附手感稳定。
3. 禁用策略：保留用户开关优先级，并在超大场景触发自动禁用，避免高负载交互抖动。
4. 可视化策略：overlay degraded 时按 axis-first / axis-relevance 降采样，保持辅助线与吸附结果一致且可读。
5. 验收已通过：
   - `node --test src/product/runtime/__tests__/runtimeSnappingPolicyBehavior.test.ts`
   - `node --test src/product/runtime/__tests__/pointerReleaseCommitPolicy.test.ts`
   - `node --test src/product/runtime/__tests__/runtimeSelectionFilterPolicyBehavior.test.ts`
   - `node --test src/product/runtime/__tests__/runtimeHitPriorityPolicyBehavior.test.ts`
   - `node --test src/product/runtime/__tests__/runtimeEditingModeTransitionPolicy.test.ts`
   - `node --test src/product/runtime/canvasInteractionController/__tests__/pointerLifecycleState.test.ts`
   - `node --test src/product/runtime/canvasInteractionController/__tests__/shapeStyleDragResolverBehavior.test.ts`
   - `tsc -p tsconfig.app.json --noEmit`

## G4：性能与可观测性

T7. 建立 M1 交互性能基线

- 优先级：P0
- Owner：性能负责人
- 依赖：T1/T3/T5
- 输出：基线场景（小/中/大文件）与采样脚本
- 验收：

1. 形成 P50/P95 基线数据
2. 可重复执行并持续对比

当前状态（2026-05-21）：

1. T7 已完成：新增基线聚合脚本，可将一个或多个 perf 报告聚合为 P50/P95 基线产物。
2. 基线文件已生成：`docs/product-requirements/m1-performance-baseline.json`（small/medium/large + mixed）。
3. 可复现命令：
   - `pnpm perf:baseline`
   - `pnpm perf:baseline:check`
4. 首版基线数据（P50/P95）：
   - `10k`：frame 11.2/11.2，hitTest 1.6/1.6
   - `50k`：frame 14.8/14.8，hitTest 2.9/2.9
   - `100k`：frame 19.6/19.6，hitTest 3.7/3.7
5. gate 验证已通过：`node ./scripts/perf-gate.mjs --report ./docs/product-requirements/m1-performance-baseline.json --config ./scripts/perf-gate.config.json`

T8. 建立诊断字段与日志规范

- 优先级：P1
- Owner：Runtime 基建负责人
- 依赖：T7
- 输出：关键指标字段（命中候选数、提交耗时、回滚次数）
- 验收：

1. 关键路径日志完整率 >= 95%
2. 问题排查可快速定位

当前状态（2026-05-21）：

1. T8 已完成：建立统一交互诊断 logger 与结构化日志规范，覆盖 pointer-down / pointer-move / pointer-up / pointer-leave / cycle-hit 关键路径。
2. 关键字段已落地：
   - 命中候选数：`hitCandidateCount`
   - 提交耗时：`transformCommitDurationMs`
   - 回滚次数：`rollbackCount`
   - 回滚原因：`rollbackReason`
3. 完整率口径已落地：`completenessRatio = emittedMetricLogCount / expectedMetricLogCount`。
4. 日志快速定位规范已落地：统一前缀 `[runtime-interaction-diagnostic]`，并按 `kind + stage + reason` 快速归因。
5. 验收验证已通过：
   - `node --test src/product/runtime/__tests__/runtimeInteractionDiagnosticPolicy.test.ts`
   - `node --test src/product/runtime/__tests__/runtimeHitPriorityPolicyBehavior.test.ts`
   - `node --test src/product/runtime/__tests__/runtimeSelectionFilterPolicyBehavior.test.ts`
   - `pnpm exec tsc -p tsconfig.app.json --noEmit`

## G5：回归与验收

T9. 核心链路回归清单

- 优先级：P0
- Owner：测试负责人
- 依赖：T2/T4/T6
- 输出：10 条关键链路回归脚本
- 验收：

1. 每次迭代均可执行
2. 回归结论可追踪

当前状态（2026-05-21）：

1. T9 已完成：已建立 10 条核心链路回归脚本清单，并提供一键执行入口 `pnpm regression:m1-core`。
2. 回归结论可追踪：脚本按 `R1-R10` 编号输出 `[PASS]/[FAIL]`，末尾输出聚合统计 `x/10 passed`。
3. 清单文档已落地：`docs/product-requirements/m1-core-regression-checklist.md`。
4. 验收验证命令：
   - `pnpm regression:m1-core`
   - `pnpm exec tsc -p tsconfig.app.json --noEmit`

T10. M1 退出评审

- 优先级：P0
- Owner：产品 + 技术联合
- 依赖：T1~T9
- 输出：M1 退出报告
- 验收：

1. 功能、性能、可靠性三类指标全部达标
2. 文档状态完成回写

当前状态（2026-05-21）：

1. T10 已完成：形成 M1 退出评审报告，覆盖功能/性能/可靠性三类指标结论。
2. 退出报告已落地：`docs/product-requirements/m1-exit-review-report-2026-05-21.md`。
3. 评审验收命令：
   - `pnpm regression:m1-core`
   - `pnpm perf:baseline:check`
   - `pnpm exec tsc -p tsconfig.app.json --noEmit`
4. 退出结论：M1 可退出（无 P0 阻断项）。

## 节奏建议（两周）

Week 1：

1. 完成 T1/T2/T3/T4/T5。

Week 2：

1. 完成 T6/T7/T8/T9。
2. 进行 T10 评审。

## 每日站会检查项

1. 是否新增跨层耦合（Product 语义侵入 Runtime 机制）。
2. 是否引入高频交互回归（误选、抖动、状态跳变）。
3. 是否完成对应验收条目与测试条目。
