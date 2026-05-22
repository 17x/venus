# M2 核心回归清单（T17）

目标：

1. 固化 M2 专业编辑核心回归脚本（不少于 10 条）。
2. 每次迭代可重复执行。
3. 回归结论可追踪（R1-R19 编号 + Step ID 映射）。

## 一键执行

```bash
pnpm m2:run-all
```

## 回归链路清单（19 条）

1. R1 M1 baseline guard（M2-01）
   - `pnpm regression:m1-core`
2. R2 Path transform session regression（M2-02）
   - `src/runtime/interaction/transformSessionRotation.test.ts`
3. R3 Path anchor edit policy regression（M2-02B）
   - `src/product/runtime/pathAnchorEditPolicy/pathAnchorEditPolicy.test.ts`
4. R4 Path topology policy regression（M2-02C）
   - `src/product/runtime/pathAnchorEditPolicy/pathAnchorEditTopologyPolicy.test.ts`
5. R5 Path preview commit policy regression（M2-03）
   - `src/product/runtime/__tests__/pointerReleaseCommitPolicy.test.ts`
6. R6 Style drag resolver regression（M2-04）
   - `src/product/runtime/canvasInteractionController/__tests__/shapeStyleDragResolverBehavior.test.ts`
7. R7 Selection mixed-style policy regression（M2-04B）
   - `src/product/runtime/__tests__/selectionMixedStylePolicy.test.ts`
8. R8 Text-runs modify policy regression（M2-04C）
   - `src/product/useEditorRuntime/__tests__/elementModifyTextRunsPolicy.test.ts`
9. R9 Engine text paragraph projection regression（M2-04D）
   - `src/runtime/presets/engineSceneAdapter/engineSceneAdapter.text.test.ts`
10. R10 Snapping policy regression（M2-05）
    - `src/product/runtime/__tests__/runtimeSnappingPolicyBehavior.test.ts`
11. R11 Normalized document runtime regression（M2-06）
    - `src/runtime/model/document-runtime/__tests__/normalizedDocumentRuntime.test.ts`
12. R12 Normalized history patches regression（M2-07）
    - `src/runtime/model/document-runtime/__tests__/normalizedHistoryPatches.test.ts`
13. R13 Worker scope binding regression（M2-08）
    - `src/runtime/worker/scope/__tests__/bindEditorWorkerScope.test.ts`
14. R14 Remote normalized apply regression（M2-09）
    - `src/runtime/worker/scope/operations/operations.remoteNormalizedApply.test.ts`
15. R15 Remote patches normalized order regression（M2-10）
    - `src/runtime/worker/scope/remotePatches/remotePatches.normalizedOrder.test.ts`
16. R16 Scene patches normalized apply regression（M2-11）
    - `src/runtime/worker/scope/scenePatches/scenePatches.normalizedApply.test.ts`
17. R17 Boolean path-editability regression（M2-11B）
    - `src/runtime/worker/scope/shapeCommandHelpers/shapeCommandHelpers.booleanPathEdit.test.ts`
18. R18 TypeScript gate（M2-12）
    - `pnpm exec tsc -p tsconfig.app.json --noEmit`
19. R19 Performance baseline gate（M2-13）
    - `pnpm perf:baseline:check`

## 结果规范

1. 按 Step ID 顺序输出每条回归状态，支持定位失败步骤。
2. 末尾输出聚合摘要，格式为 `M2 run-all summary: x/y passed`。
3. 任一失败时进程退出码非 0，便于 CI 与本地门禁统一接入。
4. 回归链路追踪方式：使用 Step ID（M2-xx）与 R 编号双向映射定位任务与测试项。
