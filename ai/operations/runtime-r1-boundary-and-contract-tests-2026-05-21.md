# Runtime R1 Boundary and Contract Tests (2026-05-21)

[CHANGE REQUEST]

Target:

- File / Module:
  - `packages/_vnext/runtime/src/platform/browserRuntimeAdapters.ts`
  - `packages/_vnext/runtime/src/platform/nodeRuntimeAdapters.ts`
  - `packages/_vnext/runtime/src/platform/runtimePlatformBoundaries.contract.test.ts`
  - `packages/_vnext/runtime/src/index.ts`
  - `ai/refactor-vnext/repo-refactor-management.md`

Goal:

- Problem being solved:
  - 完成 R1 剩余两项：增加 browser/node platform adapter boundary，并在 contract test 存在前提下推进平台无关 runtime contract 的迁移基线。

Change Type:

- Add / Modify

Impact:

- Affected modules:
  - `packages/_vnext/runtime`（staging 合同与测试）
  - `ai/refactor-vnext/repo-refactor-management.md`（任务状态回写）

Cleanup:

- Old logic to remove:
  - 无（本次不删除 app/engine 既有实现，仅新增 staging boundary 与 contract test 作为迁移前置）

Tests:

- Tests to add/update:
  - `pnpm dlx tsx --test packages/_vnext/runtime/src/platform/runtimePlatformBoundaries.contract.test.ts`
  - `pnpm --filter @venus/engine cr:check`
  - `pnpm --filter @venus/vector-editor-web exec tsc -p tsconfig.app.json --noEmit`
