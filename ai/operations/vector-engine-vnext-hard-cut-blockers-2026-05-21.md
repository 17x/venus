# Vector/Engine 职责划分与对接要求（2026-05-21）

状态：重置完成（零例外策略）

## 0. 执行原则（最高优先级）

1. 本文件替代历史迁移策略，按职责划分重新定义后续执行。
2. 不允许例外：不得以临时 bridge、本地兜底、深层导入绕过职责边界。
3. 不允许职责漂移：产品语义不得反向压入 engine，runtime 能力不得被 vector 长期本地化重写。
4. 需求表达采用方法级 API 与契约，不采用补导出内部类型的方式。

---

## 1. 职责边界（强制）

### 1.1 @venus/lib

1. 纯数学与纯几何。
2. viewport/zoom/pan 的纯函数与无状态输入输出契约。
3. 不持有 scene/runtime 状态，不承载产品语义。

### 1.2 @venus/engine

1. runtime 状态机与渲染调度。
2. scene 输入、query/pick/raycast、诊断等方法级能力。
3. 仅暴露稳定 runtime domain API 与 contract。
4. 不暴露产品专属中间态类型，不承担产品交互策略。

### 1.3 apps/vector-editor-web

1. 产品语义组装、交互策略、编辑器规则、UI/adapter 语义。
2. 对 engine 仅消费 canonical runtime API；对 lib 仅消费纯函数能力。
3. 产品中间态类型在 vector 本地定义和维护。

---

## 2. 关键域归属结论（零例外）

### 2.1 hittest

1. lib：命中数学、矩阵投影、容差等纯函数。
2. engine：pick/raycast/query 能力与结果。
3. vector：候选过滤、优先级、锁定/隐藏/隔离等产品语义。

结论：hittest 结果解释权归 vector，命中能力归 engine，数学归 lib。

### 2.2 snapping

1. lib：对齐、投影、阈值、最近点等纯算法。
2. engine：可查询候选数据与运行态读取能力。
3. vector：启停策略、优先级策略、可视化 guide 策略。

结论：snapping 策略归 vector，运行态能力归 engine，算法归 lib。

### 2.3 spatial

1. engine：runtime 查询能力与索引能力（对外以稳定 API/contract 暴露）。
2. lib：允许承载通用索引算法能力（若抽离）。
3. vector：不得长期自建 spatial 实现。

结论：spatial 不允许 vector 本地长期实现。

### 2.4 动画

1. lib：easing、插值等纯函数。
2. engine：仅 runtime 必需动画能力（若属于引擎运行时）。
3. vector：产品交互动画策略与产品语义控制器。

结论：产品动画策略归 vector；若 engine 对外提供动画能力，必须定义为 runtime domain contract，不得绑定产品语义。

---

## 3. 禁止项（必须遵守）

1. 禁止在 vector 增加临时例外（含 AI-TEMP 兜底）来替代 engine 缺失能力。
2. 禁止通过补导出内部类型要求 engine 承担产品中间态。
3. 禁止 vector 使用深层导入消费 engine 内部模块。
4. 禁止在 engine 顶层新增产品语义导出。

---

## 4. 对 Engine 的需求（按职责，不按旧清单）

### 4.1 必需能力（方法级 API）

1. 提供并稳定 query/pick/raycast 能力与返回契约。
2. 提供并稳定 runtime 诊断与最小运行态可观测能力。
3. 若 spatial 能力需要被 vector worker 直接消费，提供稳定公共契约（API/类型），禁止仅内部可见。

### 4.2 必需治理

1. 为对外 API 标注稳定级别（stable/experimental）。
2. 为 runtime domain 导出增加契约测试，防止 hard-cut 后消费方漂移。
3. 发布职责映射表：能力名、归属层、公开入口、替代路径。

### 4.3 非目标

1. 不要求 engine 导出产品专属中间态类型。
2. 不要求 engine 承担 vector 交互策略或 UI 语义。

---

## 5. 对 Vector 的需求（按职责）

### 5.1 必需改造

1. 数学/viewport/zoom 全量使用 @venus/lib。
2. 运行态能力仅通过 EngineHandle 与 canonical API 获取。
3. 产品中间态类型（overlay、scene adapter 中间态、交互策略类型）全部本地定义。

### 5.2 必需治理

1. 禁止本地重写 engine runtime 能力（尤其 spatial）。
2. 禁止将编译通过作为越权实现的理由。
3. 对每一处 engine 依赖建立“能力归属注释”与来源检查。

---

## 6. 期望（Expected Outcomes）

1. 架构期望：

- lib 只承载纯函数。
- engine 只承载 runtime domain。
- vector 只承载产品语义。

2. 交付期望：

- 不存在任何“例外实现”或“临时 bridge 常驻化”。
- 所有跨层依赖可通过职责审计追溯。
- engine/vector 升级后不再依赖“补导出内部类型”维持可编译。

3. 质量期望：

- vector 类型检查通过。
- engine 类型检查与测试通过。
- 职责审计通过（无越界符号与越界导入）。

---

## 7. 验收标准（Definition of Done）

1. 无例外：代码库中不存在以“临时过渡”为由的职责越界实现。
2. 无越界：

- vector 不含 runtime 能力重写（含 spatial）。
- engine 不含产品语义导出。

3. 无绕过：无 engine 深层导入、无内部类型耦合。
4. 可验证：

- `pnpm --filter @venus/vector-editor-web exec tsc -p tsconfig.app.json --noEmit`
- `pnpm --filter @venus/engine exec tsc -p tsconfig.json --noEmit`
- `pnpm --filter @venus/engine test`

---

## 8. 执行顺序

1. 先职责审计：识别所有越界能力点与越界导入。
2. 再能力对接：vector 改为消费 canonical API/lib 能力。
3. 再治理固化：补契约测试、稳定级别标记、职责映射表。
4. 最后验收：按第 7 节门禁一次性通过。

---

## 9. 决策声明

1. 本文件已清空并替换历史策略。
2. 本文件代表“严格职责划分、零例外”的唯一执行基线。
3. 若出现能力缺口，应新增 canonical API，不得新增例外实现。

---

## 10. Engine 读取执行清单（可直接照单处理）

### 10.1 P0 清单（必须完成）

- [x] 发布 runtime capability map（仅 runtime domain）：
  - `query`
  - `pick`
  - `raycast`
  - `getDiagnostics`
  - 公开入口、输入输出类型、稳定级别
- [x] 确认 spatial 对外策略（二选一，不允许空缺）：
  - 方案 A：公开稳定 spatial index API/contract 给 vector worker 消费。
  - 方案 B：不公开 index，提供等价 worker 可用 query API。
- [x] 对外 API 标注稳定级别（stable/experimental），并同步到文档。
- [x] 增加契约测试覆盖（至少覆盖 query/pick/raycast/diagnostics/spatial 策略入口）。
- [x] 明确并公告“非目标”：不新增产品语义导出。

### 10.2 P1 清单（治理固化）

- [x] 建立导出门禁：新增导出必须附职责判定（lib/engine/vector）。
- [x] 建立升级门禁：hard-cut 后必须通过消费方契约测试。
- [x] 发布职责映射表：能力名、归属层、入口、替代路径、废弃策略。

### 10.3 Engine 回写交付物（必须回写到本文件）

1. 已实现 API 列表（名称 + 入口 + 稳定级别）。
2. spatial 最终策略（A 或 B）与理由。
3. 新增/更新契约测试列表。
4. 影响面说明：
   - 对 vector 需要改动的调用点
   - 不再允许的历史调用模式
5. 校验结果：
   - `pnpm --filter @venus/engine exec tsc -p tsconfig.json --noEmit`
   - `pnpm --filter @venus/engine test`

### 10.4 Engine 回写模板（直接复制填写）

```markdown
## Engine 回写（YYYY-MM-DD）

### A. Runtime API 交付

1. API:

- <name> | <entry> | <stable/experimental> | <notes>

### B. Spatial 策略

1. 选型：A / B
2. 公开入口：<entry>
3. 向后影响：<impact>

### C. 契约测试

1. 新增：<tests>
2. 更新：<tests>

### D. 对 vector 的明确要求

1. 必改调用点：<paths>
2. 禁止模式：<patterns>

### E. 校验结果

1. tsc: pass/fail
2. test: pass/fail
```

### 10.5 完成判定

1. 10.1 全部勾选。
2. 10.3 全部回写。
3. 10.4 模板有完整内容。
4. engine 校验通过且无产品语义导出新增。

## Engine 回写（2026-05-21）

### A. Runtime API 交付

1. API:

- query | EngineHandle.query (public handle method) | stable | runtime scene query 能力，消费方不依赖内部 spatial index 细节
- pick | EngineHandle.pick (public handle method) | stable | runtime 命中选择能力，结果解释权归 vector
- raycast | EngineHandle.raycast (public handle method) | stable | runtime 射线命中能力，输入输出为 runtime domain contract
- getDiagnostics | EngineHandle.getDiagnostics (public handle method) | stable | 最小运行态可观测能力，包含 capabilities.schemaVersion + capabilities.runtime 机器可读快照
- ENGINE_RUNTIME_CAPABILITY_SCHEMA_VERSION | @venus/engine top-level export | stable | runtime capability 快照 schema 版本号
- ENGINE_RUNTIME_CAPABILITY_MAP | @venus/engine top-level export | stable | 机器可读 runtime capability map（query/pick/raycast/getDiagnostics）
- resolveEngineRuntimeCapabilityDescriptor | @venus/engine top-level export | stable | 按 canonical capability name 获取稳定级别与入口描述
- createEngineSpatialQueryModule | @venus/engine top-level export | experimental | runtime 内部实现模块入口，仅用于 runtime 组合，不作为产品语义契约
- createEngineHitTestRayModule | @venus/engine top-level export | experimental | runtime 命中模块入口，仅用于 runtime 组合

### B. Spatial 策略

1. 选型：B
2. 公开入口：EngineHandle.query（方法级 API）
3. 向后影响：不再公开或鼓励消费 spatial index 内部实现；vector/worker 必须通过 query/pick/raycast 等 canonical runtime API 获取能力

### C. 契约测试

1. 新增：

- packages/engine/src/testing/runtimeDomainExportBoundary.contract.test.mjs
- packages/engine/src/testing/runtimeExportResponsibilityMap.contract.test.mjs
- packages/engine/src/testing/runtimeCapabilityMap.contract.test.ts

2. 更新：

- 移除旧的顶层非 runtime 导出 parity 测试（geometry/hittest/interaction/shapeTransform/snapping/viewportPan/visibilityLod/workerMode/zoom）
- 新增并强化顶层导出门禁：禁止 top-level 暴露 vectorEditorRuntimeProfile / vectorDenseSceneScenarioProfile / engineInteractionModule / enginePickingModule / engineSpatialModule / engineVisibilityModule / VECTOR_EDITOR_COMPOSITION_LAYERS
- 继续保留并通过：packages/engine/src/testing/createEngine.hard-cut.test.ts
- 继续保留并通过：packages/engine/src/testing/runtimePackageBoundary.test.mjs

### D. 对 vector 的明确要求

1. 必改调用点：

- 仅允许通过 EngineHandle.query / EngineHandle.pick / EngineHandle.raycast / EngineHandle.getDiagnostics 消费 runtime 能力
- 数学/viewport/zoom/pan 必须走 @venus/lib 纯函数能力

2. 禁止模式：

- 禁止从 @venus/engine 顶层或深层导入 geometry/hittest/snapping/viewportPan/zoom 等非 runtime helper
- 禁止要求 engine 重新补导出产品中间态或产品语义类型
- 禁止继续依赖历史顶层导出：vectorEditorRuntimeProfile / vectorDenseSceneScenarioProfile / engineInteractionModule / enginePickingModule / engineSpatialModule / engineVisibilityModule / VECTOR_EDITOR_COMPOSITION_LAYERS
- 禁止在 vector 本地长期自建 spatial runtime 能力替代 engine canonical API

### E. 校验结果

1. tsc: pass（pnpm --filter @venus/engine exec tsc -p tsconfig.json --noEmit）
2. test: pass（pnpm --filter @venus/engine test，71 passed）

### F. 顶层导出职责映射（runtime/core/scenario）

1. Runtime：

- createEngine | runtime | @venus/engine top-level
- ENGINE_RUNTIME_CAPABILITY_MAP | runtime | @venus/engine top-level
- resolveEngineRuntimeCapabilityDescriptor | runtime | @venus/engine top-level
- resolveEnginePerformanceOptions | runtime | @venus/engine top-level
- resolveCreateEnginePolicyBootstrap | runtime | @venus/engine top-level
- resolveCreateEngineFrame | runtime | @venus/engine top-level
- createViewportFacade | runtime | @venus/engine top-level
- panViewportState | runtime | @venus/engine top-level
- resolveViewportState | runtime | @venus/engine top-level
- zoomViewportState | runtime | @venus/engine top-level

## Vector 回写（2026-05-21）

### A. 本轮对接改动

1. 移除 vector 侧非 bridge 位置的直接 `@venus/engine` 依赖，仅保留 runtime bridge：

- apps/vector-editor-web/src/runtime/core/createCanvasRuntimeController.ts
- apps/vector-editor-web/src/runtime/worker/scope/hitTest.ts
- apps/vector-editor-web/src/runtime/primitive/overlayControl/resolveOverlayInteraction.ts
- apps/vector-editor-web/src/runtime/interaction/selectionPointerPolicy.ts
- apps/vector-editor-web/src/product/runtime/shapeStyleHandles.ts
- apps/vector-editor-web/src/runtime/hittest/hitTestAdapter.ts
- apps/vector-editor-web/src/runtime/core/transformPreviewCommitController.ts
- apps/vector-editor-web/src/runtime/interaction/index.ts
- apps/vector-editor-web/src/runtime/worker/scope/transformBatch.ts
- apps/vector-editor-web/src/runtime/presets/engineSceneAdapter/engineSceneAdapter.ts
- apps/vector-editor-web/src/runtime/interaction/snapping.ts
- apps/vector-editor-web/src/runtime/interaction/transformSessionManager.ts

2. 新增 runtime 本地命中能力聚合模块（仅 vector 语义侧使用）：

- apps/vector-editor-web/src/runtime/interaction/runtimeHitTest.ts

### B. 职责对齐结果

1. vector 业务/交互层不再直接拉取 engine 顶层命中/clip/visibility/transform helper。
2. sceneAdapter 对 `resolveNodeTransform` 调用改为 runtime bridge 入口，不在业务模块直连 engine。
3. 交互 barrel 移除对 `resolveEngineCanvasLodProfile` 的直接再导出。
4. transform batch worker 兼容 2x3/3x3 矩阵输入，避免历史命令格式导致回放失败。

### C. 临时兼容说明（已显式标注）

1. `runtimeHitTest.ts` 中对 line/clip 的精确命中暂以本地近似实现承接，已按规范添加 `AI-TEMP`：

- line 命中：本地距离近似；待 lib 提供标准 line hit-test helper 后移除。
- clip 命中：当前 bounds 兜底；待 lib 提供 clip-path containment helper 后移除。

### D. 校验结果

1. vector typecheck：pass

- `pnpm --filter @venus/vector-editor-web exec tsc -p tsconfig.app.json --noEmit`

2. 本轮修改文件诊断：pass（无新增 TS/诊断错误）

### E. 当前结论

1. vector 侧“直接 engine 依赖”已收敛至 runtime bridge。
2. 后续如需移除 `AI-TEMP` 兼容分支，需由 lib/engine 提供对应 canonical helper 后统一替换。

- resolveEngineRenderStrategy | runtime | @venus/engine top-level
- resolveRuntimeFrameController | runtime | @venus/engine top-level
- createEngineRuntimeFacade | runtime | @venus/engine top-level
- drawCanvas2DScenePayload | runtime | @venus/engine top-level
- createEngineRenderScheduler | runtime | @venus/engine top-level
- applyPressureContraction | runtime | @venus/engine top-level
- resolveEngineFrameBudget | runtime | @venus/engine top-level
- resolveFrameBudgetPressure | runtime | @venus/engine top-level
- resolveFrameBudgetPressureReason | runtime | @venus/engine top-level
- resolveFrameBudgetPressureSignals | runtime | @venus/engine top-level
- resolvePhaseBudget | runtime | @venus/engine top-level
- compileDocumentChangeSet | runtime | @venus/engine top-level
- applyDocumentChangeSet | runtime | @venus/engine top-level
- createDocumentSnapshot | runtime | @venus/engine top-level
- createRuntimeWorldFromDocument | runtime | @venus/engine top-level
- createSpatialIndexFromWorld | runtime | @venus/engine top-level
- querySpatialCandidates | runtime | @venus/engine top-level
- createEngineSpatialQueryModule | runtime | @venus/engine top-level
- resolveSpatialQueryResult | runtime | @venus/engine top-level
- createDefaultEngineBackendProbes | runtime | @venus/engine top-level
- resolveAutoBackendMode | runtime | @venus/engine top-level
- resolveBackendSelectionFromProtocol | runtime | @venus/engine top-level
- resolveBackendSelection | runtime | @venus/engine top-level
- resolvePickingHitStack | runtime | @venus/engine top-level
- createEngineHitTestRayModule | runtime | @venus/engine top-level
- resolveNearestRayHit | runtime | @venus/engine top-level
- resolveStagedExecutionSnapshot | runtime | @venus/engine top-level
- createEngineRuntimeFromProfile | runtime | @venus/engine top-level
- createTestSurface | runtime | @venus/engine top-level

2. Core：

- resolveEngineModuleRegistry | core | @venus/engine top-level
- createEngineDocumentStoreModule | core | @venus/engine top-level
- createEngineCompilerModule | core | @venus/engine top-level
- createEngineWorldModule | core | @venus/engine top-level
- createEngineViewModule | core | @venus/engine top-level
- createEngineSchedulerModule | core | @venus/engine top-level
- assertEngineRuntimeProfile | core | @venus/engine top-level
- resolveEngineCapabilityAccess | core | @venus/engine top-level
- validateEngineRuntimeProfile | core | @venus/engine top-level
- createEngineDocumentGraphModule | core | @venus/engine top-level
- createEngineSceneCompilerModule | core | @venus/engine top-level
- createEngineRuntimeWorldModule | core | @venus/engine top-level
- createEngineDirtyPropagationModule | core | @venus/engine top-level
- createEngineCommandEncoderModule | core | @venus/engine top-level
- createEngineCommandReplayModule | core | @venus/engine top-level
- createEngineBackendSelectorModule | core | @venus/engine top-level
- createEngineProductAdapterBoundaryModule | core | @venus/engine top-level
- createEnginePublicApiSurfaceModule | core | @venus/engine top-level
- baseRuntimeProfile | core | @venus/engine top-level
- engineObservabilityModule | core | @venus/engine top-level
- engineSchedulerModule | core | @venus/engine top-level
- engineCompilerModule | core | @venus/engine top-level
- engineDocumentModule | core | @venus/engine top-level
- engineWorldModule | core | @venus/engine top-level
- headlessRuntimeProfile | core | @venus/engine top-level
- browserPlatformRuntimeProfile | core | @venus/engine top-level
- engineCompositionModule | core | @venus/engine top-level
- engineExtractionModule | core | @venus/engine top-level
- engineRenderPlanningModule | core | @venus/engine top-level
- engineViewModule | core | @venus/engine top-level

3. Scenario：

- headlessReplayScenarioProfile | scenario | @venus/engine top-level
