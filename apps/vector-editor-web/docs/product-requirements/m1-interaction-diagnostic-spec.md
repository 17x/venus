# M1 交互诊断字段与日志规范（T8）

目标：

1. 统一关键交互路径诊断字段。
2. 固化可检索日志前缀与事件结构。
3. 提供完整率计算口径，支持回归验收。

## 一、日志前缀与事件类型

统一日志前缀：

- `[runtime-interaction-diagnostic]`

事件类型：

1. `hit-candidate`
2. `transform-commit`
3. `transform-rollback`

关键路径 stage：

1. `pointer-down`
2. `pointer-move`
3. `pointer-up`
4. `pointer-leave`
5. `selection-cycle`

## 二、关键字段（T8 验收字段）

1. 命中候选数：`hitCandidateCount`
2. 提交耗时（ms）：`transformCommitDurationMs`
3. 回滚次数：`rollbackCount`
4. 回滚原因：`rollbackReason`

## 三、完整率口径

完整率定义：

- `completenessRatio = emittedMetricLogCount / expectedMetricLogCount`

字段解释：

1. `expectedMetricLogCount`：已处理的关键路径诊断事件数。
2. `emittedMetricLogCount`：携带有效必填指标的事件数。
3. `completenessRatio`：范围 `[0, 1]`。

当前实现要求：

1. 关键路径事件全部走统一 logger。
2. 指标字段无效（如 NaN）将计入 expected，但不计入 emitted。
3. 目标阈值：`completenessRatio >= 0.95`。

## 四、快速定位建议

1. 按前缀检索：`[runtime-interaction-diagnostic]`
2. 先看 `kind + stage` 定位分支，再看 `rollbackReason` 和 `coverage`。
3. 对 transform 异常优先看：
   - `transform-commit` 是否缺失
   - `transform-rollback` 是否激增
   - `pointer-up-no-transform-command` 与 `pointer-up-stale-preview-cleanup` 分布

## 五、参考实现位置

1. `src/product/runtime/interactionDiagnosticPolicy.ts`
2. `src/product/runtime/canvasInteractionController/canvasInteractionController.pointerDown.ts`
3. `src/product/runtime/canvasInteractionController/canvasInteractionController.pointerMove.ts`
4. `src/product/runtime/canvasInteractionController/canvasInteractionController.pointerRelease.ts`
5. `src/product/runtime/createEditorRuntimeCommandController.ts`
6. `src/product/useEditorRuntime/pointerRelease.ts`
7. `src/product/useEditorRuntime/useEditorRuntime.ts`
