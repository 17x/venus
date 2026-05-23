# M2 执行任务清单（开工版）

目标：

1. 在 M1 稳定基线之上，补齐专业编辑深度能力。
2. 聚焦路径、样式/文字、结构交互三条价值链路。

范围：

1. 模块 02：路径增强（R2/R5）。
2. 模块 03：样式/文字增强（R1/R2/R3）。
3. 模块 04：图层结构与布尔体验增强（R1/R3/R4）。

## 任务分组

## G1：路径与几何编辑增强

T11. 路径锚点操作统一（增删/角平滑转换）

- 优先级：P0
- Owner：Path Runtime 负责人
- 依赖：M1 T1/T5
- 输出：统一路径锚点编辑策略与命令映射
- 验收：

1. 200+ 点路径编辑无几何跳变
2. 锚点类型切换与控制柄行为可预测

T12. 路径段分割/闭合/断开主链路

- 优先级：P1
- Owner：Path Runtime 负责人
- 依赖：T11
- 输出：路径段分割与闭合状态机
- 验收：

1. 分割点位置稳定且可撤销
2. 闭合/断开后路径拓扑一致

## G2：样式与文字一致性增强

T13. 多选样式混合态统一

- 优先级：P0
- Owner：Style Product 负责人
- 依赖：M1 T4/T8
- 输出：属性面板混合态规范（统一值/混合值）
- 验收：

1. 多选样式字段展示一致
2. 样式修改可完整回放（undo/redo）

T14. 文字 run 与段落能力补齐

- 优先级：P1
- Owner：Text Product 负责人
- 依赖：T13
- 输出：run 样式与段落参数（对齐/缩进/间距）能力闭环
- 验收：

1. 中英文混排编辑稳定
2. 切换样式不丢失 run 信息

## G3：结构、蒙版与布尔增强

T15. 图层树与画布选择一致性加固

- 优先级：P0
- Owner：Structure Product 负责人
- 依赖：M1 T4/T9
- 输出：图层树选择/重排与画布选择一致性策略
- 验收：

1. 图层操作与画布选择保持一致
2. 大量图层滚动与选择无明显阻塞

T16. 蒙版/布尔可编辑性增强

- 优先级：P1
- Owner：Geometry Runtime 负责人
- 依赖：T15
- 输出：蒙版关系可视化与布尔后继续编辑主链路
- 验收：

1. 蒙版撤销/重做无结构损坏
2. 布尔结果可继续路径编辑且拓扑稳定

## G4：M2 验收与治理

T17. M2 核心回归清单（专业编辑）

- 优先级：P0
- Owner：测试负责人
- 依赖：T11-T16
- 输出：M2 核心回归脚本（不少于 10 条）
- 验收：

1. 每次迭代可重复执行
2. 回归结论可追踪

T18. M2 退出评审

- 优先级：P0
- Owner：产品 + 技术联合
- 依赖：T11-T17
- 输出：M2 退出评审报告
- 验收：

1. 功能、性能、可靠性三类指标达标
2. 文档状态完成回写

## 立即执行（本周）

1. 先开 T11：路径锚点操作统一（路径编辑主链路基础）。
2. 并行预研 T13：多选样式混合态规范草案。
3. 维持 M1 回归与性能门禁持续开启（`pnpm regression:m1-core` + `pnpm perf:baseline:check`）。

当前状态（2026-05-21）：

1. M2 全量并跑入口已建立：`pnpm m2:run-all`。
2. 并跑内容包含路径、样式、结构相关回归 + 类型门禁 + 性能门禁。
3. T11 已完成首版接线：路径锚点删除/插入/角平滑切换策略落地，并接入动作执行链路。
4. T11 验收已通过：新增路径锚点策略测试 + `pnpm exec tsc -p tsconfig.app.json --noEmit` + `pnpm m2:run-all`（14/14 通过）。
5. T12 已完成首版接线：路径段分割与路径闭合/断开动作已接入统一策略与执行链路。
6. T12 验收已通过：新增路径拓扑策略测试 + `pnpm exec tsc -p tsconfig.app.json --noEmit` + `pnpm m2:run-all`（15/15 通过）。
7. T13 已完成阶段一：多选样式 mixed-state 读侧聚合 + 属性面板批量覆盖写入链路打通。
8. T13 阶段一验收已通过：`pnpm exec tsc -p tsconfig.app.json --noEmit` + `pnpm m2:run-all`（15/15 通过）。
9. T13 已完成阶段二：mixed-state 纯策略模块抽离并新增专项回归测试，避免重依赖链导致测试不稳定。
10. T13 阶段二验收已通过：`node --test src/product/runtime/__tests__/selectionMixedStylePolicy.test.ts` + `pnpm exec tsc -p tsconfig.app.json --noEmit` + `pnpm m2:run-all`（16/16 通过）。
11. T14 已完成阶段一：textRuns 命令链路已打通（属性面板 -> element.modify -> shape.patch -> 协作/历史/场景应用），并补齐字号/行高/字距/对齐与段落缩进/段前后距控件写入。
12. T14 阶段一验收已通过：`node --test src/product/useEditorRuntime/__tests__/elementModifyTextRunsPolicy.test.ts` + `pnpm exec tsc -p tsconfig.app.json --noEmit` + `pnpm m2:run-all`（17/17 通过）。
13. T14 已完成阶段二：引擎文本适配层已接入段落字段透传，新增纯适配辅助函数回归并纳入 M2 全量门禁。
14. T14 阶段二验收已通过：`node --test src/runtime/presets/engineSceneAdapter/engineSceneAdapter.text.test.ts` + `pnpm exec tsc -p tsconfig.app.json --noEmit` + `pnpm m2:run-all`（18/18 通过）。
15. T15 已完成阶段一：Variant-B 图层树补齐 Shift 范围选择语义，并与 LayerPanel 的 replace/toggle/add 行为对齐，消除图层树与画布选择手势差异。
16. T15 阶段一验收已通过：`pnpm exec tsc -p tsconfig.app.json --noEmit` + `pnpm m2:run-all`（18/18 通过）。
17. T15 已完成阶段二：图层树引入选中项自动可视滚动稳定策略，图层重排/筛选/多选变化后保持选中锚点可见，降低大量图层场景下的定位跳动成本。
18. T15 阶段二验收已通过：`pnpm exec tsc -p tsconfig.app.json --noEmit` + `pnpm m2:run-all`（18/18 通过）。
19. T16 已完成阶段一：图层树补齐蒙版关系可视化标识（Host/Source），并由运行时 schema 与 clip 关系驱动，提升结构可读性与误操作可见性。
20. T16 阶段一验收已通过：`pnpm exec tsc -p tsconfig.app.json --noEmit` + `pnpm m2:run-all`（18/18 通过）。
21. T16 已完成阶段二：布尔输出路径补齐线性 `bezierPoints`，保证布尔结果可继续进入路径锚点编辑链路并维持基础拓扑一致性。
22. T16 阶段二验收已通过：新增 `shapeCommandHelpers.booleanPathEdit` 回归并接入 `m2:run-all`，`pnpm exec tsc -p tsconfig.app.json --noEmit` + `pnpm m2:run-all`（19/19 通过）。
23. T17 已完成：新增 M2 核心回归清单文档并建立 R1-R19 与 M2 Step ID 映射，形成可追踪回归证据索引。
24. T17 验收已通过：`pnpm m2:run-all` 持续可重复执行（19/19 通过），并完成文档化沉淀 `m2-core-regression-checklist.md`。
25. T18 已完成：形成 M2 退出评审报告，覆盖功能/性能/可靠性三类指标与退出判定结论。
26. T18 验收已通过：复用 `pnpm m2:run-all` 作为统一证据入口（19/19 通过），并完成目标与执行文档状态回写。

## G5：文档模型治理（初始化任务池）

当前状态（2026-05-23）：已完成（可关单）

T19. 文档契约与不变量定义

- 优先级：P0
- Owner：Model Runtime 负责人
- 依赖：T15/T16
- 状态：已完成
- 输出：文档模型契约与结构不变量清单
- 验收：

1. 不变量清单可映射自动化测试
2. 结构命令后不变量检查稳定通过

T20. 生命周期状态与保存恢复语义

- 优先级：P0
- Owner：Runtime 基建负责人
- 依赖：T19
- 状态：已完成
- 输出：document lifecycle contract（dirty/saving/recovery）
- 验收：

1. 生命周期状态可观测
2. 异常恢复不破坏结构一致性

T21. 页面与样式引用模型

- 优先级：P1
- Owner：Product Model 负责人
- 依赖：T19
- 状态：已完成
- 输出：pages 与 style reference 最小模型
- 验收：

1. 多页面最小链路可运行
2. 样式引用与内联样式可回放

T22. 扩展元数据命名空间与导入导出约束

- 优先级：P1
- Owner：架构负责人
- 依赖：T19/T21
- 状态：已完成
- 输出：extensions namespace 规范与兼容约束
- 验收：

1. 导入导出保留扩展字段
2. 未知扩展字段不导致崩溃

T23. 文档模型专项回归与压力测试

- 优先级：P0
- Owner：测试负责人
- 依赖：T19-T22
- 状态：已完成
- 输出：结构/序列化/回放/大文档专项回归
- 验收：

1. 大文档结构操作稳定
2. deterministic replay 回归通过

G5 验收证据（2026-05-23）：

1. 新增治理合同测试：`src/testing/product-specs/document-structure/document-governance.contract.test.ts`
2. 覆盖 T19：契约归一化 + 结构不变量违规码检查
3. 覆盖 T20：dirty/saving/recovery/opened 生命周期可观测转换
4. 覆盖 T21/T22：pages/styleReferences/extensions 导入导出回放与未知字段保留
5. 覆盖 T23：2000 节点结构压力 + 双写一致性 + deterministic reorder 计划一致性
6. M2 并跑接线：`scripts/m2-run-all.mjs` 新增 `M2-07B`
