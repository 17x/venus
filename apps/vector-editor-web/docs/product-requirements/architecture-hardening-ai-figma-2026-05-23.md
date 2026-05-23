# Vector 架构强化需求（对标 Adobe Illustrator / Figma）

## 1. 目标

在不触碰 engine 实现的前提下，强化 vector 当前已较完善架构中的细节能力，重点覆盖：

1. 文档模型
2. group 逻辑
3. history 系统
4. runtime 对接契约

## 2. 文档模型强化

### 2.1 Canonical 结构约束

1. parentId 与 group.childIds 必须双向一致
2. 任意 patch 应保证结构约束可验证
3. 每次提交后输出 dual-write consistency 结果

### 2.2 版本与迁移

1. 文档 schema 需带 major/minor 版本
2. 旧文档迁移过程必须可重放
3. 迁移失败应进入只读降级并给出诊断

### 2.3 生命周期状态机

状态：created -> opened -> dirty -> saving -> saved -> recovery -> closed

要求：

1. 任一状态切换需记录事件来源
2. dirty 状态来源可追踪到 command/transaction
3. recovery 完成后必须输出一致性校验结果

## 3. Group 逻辑强化

### 3.1 结构操作

1. group / ungroup / reparent / reorder 统一由结构补丁驱动
2. sibling order 作为一等语义，不允许隐式漂移
3. 隔离编辑下只允许在作用域内重排

### 3.2 复杂场景

1. 深层嵌套 group 的 bounds 需增量更新
2. 蒙版组关系与 group 重排必须互不破坏
3. 布尔结果对象的父子关系需可继续编辑

### 3.3 诊断与可观测

1. group 结构异常统一输出诊断码
2. 提供 group consistency 快速检查入口

## 4. History 强化

### 4.1 事务模型

1. 命令必须归属于 transaction id
2. 单交互链可压缩为 batch command
3. merge 策略需显式声明（time-window + command-type）

### 4.2 本地与远程

1. local history 负责 undo/redo
2. remote history 进入观察日志，不参与本地撤销
3. replay 时支持 local-only / merged 两种模式

### 4.3 恢复与重放

1. 每个 history entry 必须具备 forward/backward patches
2. crash recovery 要支持最近 N 步重放
3. deterministic replay 必须以相同输入得到相同结构输出

## 5. Runtime 对接强化（不改 engine）

### 5.1 契约边界

1. runtime 不依赖 engine 私有实现
2. 所有调用仅通过 facade + contract
3. adapter 层负责语义映射，不承载产品策略

### 5.2 状态同步

1. scene revision、selection revision、viewport revision 分离
2. render invalidation 原因码标准化
3. 提供 state synchronization 诊断字段

### 5.3 可测试性

1. 所有桥接契约必须存在 integration contract tests
2. adapter 输出必须可 snapshot 对比

## 6. 分类完善的需求清单

### 6.1 Editor Core

1. Interaction Flow Test
2. Editor State Test
3. Selection/Hover/Focus State Test

### 6.2 Viewport Core

1. Pan Zoom Test
2. Fit View Test
3. Scroll Behavior Test
4. Minimap Test

### 6.3 Document Core

1. Scene Snapshot Test
2. Scene Serialization Test
3. Document Lifecycle Test
4. Persistence Test

### 6.4 Command + History

1. Command System Test
2. Undo Redo Test
3. Command Merge Test
4. Batch Command Test
5. Transaction Test

### 6.5 Structure + Editing

1. Grouping Test
2. Layer Management Test
3. Transform/Resize/Rotate Workflow Test
4. Snapping/Alignment/Smart Guide Test

### 6.6 Runtime Integration

1. Integration Contract Test
2. Engine Adapter Test
3. Render Invalidation Test
4. Scene Sync Test
5. State Synchronization Test

### 6.7 Quality Gates

1. Benchmark Test
2. Large Scene Benchmark
3. Memory Leak Test
4. Replay Regression Test
5. Deterministic Workflow Test
6. E2E Workflow Test

## 7. 验收标准

1. 每类需求至少有一个可执行测试入口
2. 结构一致性错误可在 5 分钟内定位
3. 历史与重放在核心链路达到 deterministic
4. runtime-engine 对接改动不引入跨层语义泄漏

## 8. 实施状态（2026-05-23）

说明：以下状态基于当前仓库实现与测试门禁结果回写。

### 8.1 文档模型

1. 2.1 Canonical 结构约束：已完成

- 结果：双写一致性校验、结构补丁一致性、治理不变量校验均已落地。
- 证据：
  - `src/runtime/model/document-runtime/documentGovernance.ts`
  - `src/runtime/model/document-runtime/normalizedHistoryPatches.ts`
  - `src/testing/product-specs/document-structure/grouping-document-model.contract.test.ts`
  - `src/testing/product-specs/document-structure/document-governance.contract.test.ts`

2. 2.2 版本与迁移：已完成（当前范围）

- 已完成：schema header 已补齐 `name/version/major/minor` 语义，并在导入归一化链路实现“迁移失败只读降级 + 诊断码”回退。
- 结果：不支持 schema major 或异常 payload/config 的文件会进入 readonly recovery，并携带稳定 migration diagnostic codes。

3. 2.3 生命周期状态机：已完成（当前范围）

- 已完成：`created/opened/dirty/saving/saved/recovery/closed` 生命周期模型与演进函数可观测，并补齐“状态切换事件来源 + dirty 来源追踪到 command/transaction”链路。
- 已完成：create/save 产品入口已显式落在 `created/saved` 状态，并补齐 `file.create/file.save` 事件来源断言。

### 8.2 Group 逻辑

1. 3.1 结构操作：已完成（当前范围）

- 结果：group/ungroup/reparent/reorder 已纳入结构补丁与 sibling order 一等语义。

2. 3.2 复杂场景：部分完成

- 已完成：深层嵌套 group bounds 递归派生、布尔结果可继续编辑链路已覆盖。
- 已完成：隔离编辑作用域内重排约束（`shape.reorder` 在隔离态下仅允许作用域内 sibling 重排）已落地。
- 已完成：蒙版组与 group 重排全场景回归矩阵已补齐（本地/远端 patch parity 覆盖 reorder/group/ungroup）。

3. 3.3 诊断与可观测：部分完成

- 已完成：结构异常可通过 dual-write + invariant violation 快速定位。
- 已完成：group 诊断码枚举 + 对外快速检查入口（`runNormalizedGroupConsistencyQuickCheck`）已落地，支持稳定 code 级断言。
- 已完成：UI/debug 面板已接入 group quick-check 可视化摘要（valid/count/codes）用于快速分诊。

### 8.3 History

1. 4.1 事务模型：已完成（当前范围）

- 结果：transaction id、merge policy（time-window + command-type）和 transactionGroups 摘要已落地。

2. 4.2 本地与远程：已完成（当前范围）

- 已完成：local undo/redo 与 remote 观察日志分离语义。
- 已完成：replay 的 local-only / merged 双模式显式入口已在 editor config、runtime 启动参数与 worker 启动恢复链路完成产品化。

3. 4.3 恢复与重放：已完成（当前范围）

- 已完成：forward/backward patches 与 deterministic 结构重放回归（关键链路）已覆盖。
- 已完成：crash recovery 最近 N 步回放快照链路（local-only / merged）已在 history summary 与文件持久化配置中打通。
- 已完成：启动阶段会自动消费持久化 crash recovery 回放快照并注入 worker history 恢复链路。

### 8.4 Runtime 对接（不改 engine）

1. 5.1 契约边界：部分完成

- 已完成：runtime 侧以 facade/adapter 契约调用为主，未引入 engine 私有实现依赖改动。
- 已完成：adapter 输出 snapshot 对比体系已补齐系统化治理聚合合同测试，并接入 runtime debug 面板只读摘要（available/consistent/counts/issues）。

2. 5.2 状态同步：已完成（当前范围）

- 已完成：scene/selection/viewport revision 三分模型已在 runtime snapshot 同步诊断字段中落地。
- 已完成：render invalidation 原因码在 runtime 层统一为标准化 code 集合并可测试。

3. 5.3 可测试性：已完成（当前范围）

- 已完成：integration contract tests 已存在并持续扩展。
- 已完成：adapter 输出 snapshot 对比矩阵已补充 fileFormatScene / fileDocument / readFileNormalize 合同覆盖。
- 已完成：runtime event bus 的 bridge 发布链（render/viewport/shell/migration）snapshot 合同覆盖已补齐。
- 已完成：UI hook 层 bridge（useEditorRuntimeBridgeSync）端到端 snapshot 覆盖（文件边界 reset + selection/shell/migration 发布链）已补齐。

## 9. 已新增证据索引（本轮）

1. 文档治理核心：`src/runtime/model/document-runtime/documentGovernance.ts`
2. 文档治理单测：`src/runtime/model/document-runtime/__tests__/documentGovernance.test.ts`
3. 导入兼容与只读降级测试：`src/runtime/adapters/__tests__/readFileHelper.normalizeFile.test.ts`
4. 治理产品合同测试：`src/testing/product-specs/document-structure/document-governance.contract.test.ts`
5. 历史 transaction UI 消费测试：
   - `src/testing/product-specs/history/history-panel-transaction-groups.contract.test.ts`
   - `src/testing/product-specs/history/history-panel-transaction-presentation.contract.test.ts`
6. 生命周期 create/open/save/recovery 入口与来源断言测试：`src/product/__tests__/useEditorDocument.lifecycle.test.ts`
7. 启动恢复重放 worker 合同测试：`src/runtime/worker/scope/__tests__/bindEditorWorkerScope.test.ts`
8. 状态同步 revision/invalidation 合同测试：`src/runtime/core/__tests__/stateSynchronization.contract.test.ts`
9. adapter snapshot 合同测试：

- `src/runtime/adapters/__tests__/fileFormatScene.contract.test.ts`
- `src/runtime/adapters/__tests__/fileDocument.contract.test.ts`
- `src/runtime/adapters/__tests__/readFileHelper.normalizeFile.test.ts`

10. bridge 发布链 snapshot 合同测试：`src/runtime/events/index/index.test.ts`
11. UI hook 层 bridge snapshot 合同测试：`src/testing/product-specs/integration-contract/runtime-bridge-sync.contract.test.ts`
12. replay 双模式产品化与 worker 启动恢复合同测试：

- `src/runtime/worker/scope/__tests__/bindEditorWorkerScope.test.ts`
- `src/runtime/adapters/__tests__/readFileHelper.normalizeFile.test.ts`

13. 蒙版组 × group 重排 parity 回归矩阵：

- `src/runtime/worker/scope/normalizedPatchParity/normalizedPatchParity.test.ts`
- `src/runtime/worker/scope/normalizedPatchParity/normalizedPatchParity.fixtures.ts`
- `src/runtime/worker/scope/remotePatches/remotePatches.normalizedOrder.test.ts`

14. adapter snapshot 治理聚合合同测试：

- `src/runtime/adapters/__tests__/adapterSnapshotGovernance.contract.test.ts`

## 10. 回主线后的优先顺序

1. P1：将 adapter snapshot 治理摘要从计数级升级到契约 diff 明细（字段级）并加入风险分级。
2. P1：补齐 adapter 治理摘要在 CI 报告中的聚合出口（machine-readable artifact）。

## 11. CHANGE REQUEST（2026-05-23 / P1-Group-Isolation）

[CHANGE REQUEST]

Target:

- File / Module:
  - `src/runtime/worker/protocol.ts`
  - `src/runtime/model/document-runtime/normalizedHistoryPatches.ts`
  - `src/runtime/model/document-runtime/index.ts`
  - `src/runtime/worker/scope/localHistoryEntry/localHistoryEntry.ts`
  - `src/runtime/worker/scope/operationPayload.ts`
  - `src/runtime/worker/scope/remotePatches/remotePatches.ts`
  - `src/product/useEditorRuntime/coreCallbacks.ts`
  - `src/runtime/model/document-runtime/__tests__/normalizedHistoryPatches.test.ts`
  - `src/testing/product-specs/document-structure/grouping-document-model.contract.test.ts`

Goal:

- Problem being solved:
  - 隔离编辑状态下当前 `shape.reorder` 仍可能执行跨作用域重排，且 group 结构异常缺少可直接调用的快速检查入口与稳定诊断码。

Change Type:

- Add / Modify / Remove
  - modify `shape.reorder` command contract and planner input with optional isolation scope metadata.
  - add normalized reorder isolation guard that rejects out-of-scope sibling reorders.
  - add group consistency quick-check API with stable diagnostic code output.

Impact:

- Affected modules:
  - runtime worker local/remote reorder planning parity
  - product runtime reorder command emission
  - document-runtime governance/diagnostic entrypoints

Cleanup:

- Old logic to remove:
  - remove implicit assumption that any selected node can reorder regardless of isolation scope.

Tests:

- Tests to add/update:
  - add normalized reorder isolation-scope contract coverage.
  - add group consistency quick-check contract coverage with stable diagnostic codes.

## 12. CHANGE REQUEST（2026-05-23 / P1-Adapter-Snapshot-Governance）

[CHANGE REQUEST]

Target:

- File / Module:
  - `src/runtime/adapters/__tests__/adapterSnapshotGovernance.contract.test.ts`
  - `docs/product-requirements/architecture-hardening-ai-figma-2026-05-23.md`

Goal:

- Problem being solved:
  - adapter snapshot 覆盖虽然分散存在，但缺少统一聚合视图来系统化验证 normalize/fileDocument/fileFormatScene 的契约一致性与证据归档。

Change Type:

- Add / Modify / Remove
  - add adapter snapshot governance aggregate contract test.
  - update architecture hardening evidence index and refreshed priority queue.

Impact:

- Affected modules:
  - runtime adapters integration-contract test coverage
  - architecture hardening execution ledger

Cleanup:

- Old logic to remove:
  - remove duplicated/stale priority lines in architecture hardening doc tail section.

Tests:

- Tests to add/update:
  - add integration contract test aggregating normalize/fileDocument/fileFormatScene snapshot matrix.
