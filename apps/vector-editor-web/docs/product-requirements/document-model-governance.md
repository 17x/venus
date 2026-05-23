# 文档模型治理（初始化）

## 1. 目标与约束

目标：

1. 对当前文档模型做对标 Adobe Illustrator / Figma 的差距诊断。
2. 判断现状是否足够完善、结构是否足够稳定、设计是否足够出色。
3. 输出可直接执行的任务清单（按优先级分层）。

约束：

1. 当前处于初始化版本阶段，本治理文档采用非版本化命名。
2. 不引入“v2/v3”式平行实现，沿现有模型演进。

## 2. 基线对象

当前核心模型：

1. `EditorDocument`：`id/name/width/height/shapes`
2. `DocumentNode`：扁平数组 + `parentId/childIds` 双表达
3. `NormalizedRuntimeDocument`：运行时归一化投影（`rootIds/nodes`）
4. 历史补丁：`HistoryPatch`（结构/几何/样式基础覆盖）

## 3. 对标评估（AI / Figma）

### 3.1 完善度评估

结论：当前“可用但不够完善”，适合初始化阶段，不足以支撑中长期复杂能力。

已具备：

1. 形状基础属性与路径/文本/样式核心字段。
2. 组结构与 parent-child 双向修复机制。
3. 归一化运行时投影与一致性校验入口。

主要缺口：

1. 页面模型缺失：仅单页面画布语义，不支持多 page/artboard 管理。
2. 组件模型缺失：无 component/instance/override 主干语义。
3. 约束与布局语义缺失：无 constraints/auto-layout 核心字段。
4. 资源系统不足：颜色/文本样式/效果样式/token 的引用型模型不完整。
5. 导入导出语义不足：缺少稳定 schema contract 与 lossless 约束。

### 3.2 结构稳定性评估

结论：基础稳定，但仍有中风险结构点。

稳定项：

1. `parentId + childIds` 双写一致性治理已建立。
2. 结构命令（group/ungroup/reorder/insert/remove）具备归一化校验。
3. 组 bounds 派生具备循环防护与 epsilon 控制。

风险项：

1. 扁平数组与层级双表达长期并存，复杂操作下维护成本高。
2. 仍存在兼容回填分支（旧场景 `childIds` 缺失），说明持久化契约尚未收口。
3. 文档级生命周期状态（dirty/saving/recovery）未内建到模型契约。

### 3.3 设计质量评估

结论：工程设计“清晰且实用”，但尚未达到“出色的产品级模型设计”。

优点：

1. 模型可读性高，字段语义清晰，便于调试。
2. 归一化层作为兼容桥设计合理，利于渐进迁移。
3. 历史补丁词汇覆盖较全，适配当前编辑主链路。

不足：

1. 数据域边界尚未完全分层（文档结构域、样式域、资源域、协作域耦合仍偏松散）。
2. 缺少“引用型”对象（StyleRef/AssetRef/ComponentRef）的一等建模。
3. 缺少可扩展元数据命名空间规范，未来插件/扩展易冲突。

## 4. 是否需要添加

需要添加，且建议按 P0/P1/P2 递进。

### 4.1 P0（结构稳定与治理）

1. 文档契约补全：增加 `schema`, `createdAt`, `updatedAt`，明确迁移入口。
2. 生命周期模型：增加 `documentState`（opened/dirty/saving/recovery/closed）。
3. 结构不变量声明：统一列出并自动化校验（无孤儿、无环、父子互反一致、顺序稳定）。
4. 归一化持久化策略：明确何时只做运行时投影，何时回写 canonical 结构。

### 4.2 P1（产品能力可扩展）

1. 页面模型：`pages[]` + `activePageId`。
2. 样式系统：`fillStyleId/strokeStyleId/textStyleId/effectStyleId` 引用化。
3. 约束语义：节点级 constraints / layout hints。
4. 资源引用：资产、字体、颜色变量、组件实例的稳定引用字段。

### 4.3 P2（生态与协作前置）

1. 扩展元数据命名空间：`extensions: Record<string, unknown>`。
2. 协作字段预留：操作上下文、actor/source、冲突解决 hint。
3. 结构快照与回放标签：用于 deterministic replay 与问题定位。

## 5. 任务插入（可直接执行）

## G5：文档模型治理（初始化）

T19. 文档契约与不变量定义

- 优先级：P0
- 输出：文档模型契约与不变量清单（单一真值文档）
- 验收：

1. 不变量清单可映射到自动化测试
2. 任意结构命令后可验证通过

T20. 生命周期状态与保存恢复语义

- 优先级：P0
- 输出：document lifecycle contract + 运行时状态同步策略
- 验收：

1. dirty/saving/recovery 状态可观测
2. 异常恢复不破坏结构一致性

T21. 页面与样式引用模型

- 优先级：P1
- 输出：pages + style reference 最小可用模型
- 验收：

1. 支持多页面基础切换
2. 样式引用与内联样式可共存且可回放

T22. 扩展元数据命名空间与导入导出约束

- 优先级：P1
- 输出：extensions namespace + schema 扩展规范
- 验收：

1. 导入导出保留扩展字段
2. 未知扩展字段不导致崩溃

T23. 结构回归与压力测试

- 优先级：P0
- 输出：文档模型专项回归（结构/序列化/回放/大文档）
- 验收：

1. 大文档结构操作稳定
2. deterministic replay 可重复通过

## 6. 综合结论

1. 够不够完善：当前不够完善，适合初始化阶段但无法覆盖中长期产品深度。
2. 结构够不够稳定：基础稳定，但双表达与兼容回填仍是中风险点。
3. 设计够不够出色：工程可维护性不错，但产品抽象深度仍不足。
4. 有没有要添加：需要，优先补契约与生命周期，再扩展页面/样式引用模型。

## 7. 执行状态与关单标准（2026-05-23）

### 7.1 当前执行状态

G5 总体状态：已完成（可关单）。

1. T19 文档契约与不变量定义：已完成
2. T20 生命周期状态与保存恢复语义：已完成
3. T21 页面与样式引用模型：已完成
4. T22 扩展元数据命名空间与导入导出约束：已完成
5. T23 结构回归与压力测试：已完成

证据入口：

1. 新增 product-spec：`src/testing/product-specs/document-structure/document-governance.contract.test.ts`
2. M2 并跑接线：`scripts/m2-run-all.mjs`（新增 M2-07B）
3. 结构与双写一致性既有回归：
   - `src/runtime/model/document-runtime/tests/normalizedDocumentRuntime.test.ts`
   - `src/runtime/model/document-runtime/tests/normalizedHistoryPatches.test.ts`

### 7.2 关单标准（何时可以关闭任务清单）

仅当以下条件全部满足，G5 任务清单才可关闭：

1. T19-T23 的验收项全部打勾，且每项至少有一个可追溯证据入口（代码位置或测试文件）。
2. 文档契约形成单一真值并被测试映射，不再依赖兼容回填作为主路径行为。
3. 生命周期状态（dirty/saving/recovery）可观测，且异常恢复链路有回归用例。
4. pages 与 style reference 最小模型可运行，且可与内联样式共存回放。
5. extensions 字段导入导出在未知字段场景下稳定（保留且不崩溃）。
6. 结构/序列化/回放/大文档专项回归稳定通过，并完成 deterministic replay 证据。
7. 执行清单与索引文档状态同步回写（`m2-execution-backlog.md` 与本文件状态一致）。

### 7.3 当前是否可关闭

结论：当前可关闭。

原因：

1. T19-T23 的验收项已映射到自动化测试并完成证据回写。
2. 生命周期、页面/样式引用、extensions 导入导出兼容与结构压力回归均有可追溯入口。
3. 本文件与 `m2-execution-backlog.md` 状态已同步。

关单记录：

1. G5 总体状态：已完成
2. T19-T23：已完成（附证据）
3. 关单日期：2026-05-23
