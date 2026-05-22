# Renderer R2 Shared Backend Contract Bootstrap (2026-05-22)

[CHANGE REQUEST]

Target:

- File / Module:
  - `packages/_vnext/renderer-shared/package.json`
  - `packages/_vnext/renderer-shared/README.md`
  - `packages/_vnext/renderer-shared/src/contracts/rendererBackendContract.ts`
  - `packages/_vnext/renderer-shared/src/tests/rendererContractConformance.test.ts`
  - `packages/_vnext/renderer-shared/src/index.ts`
  - `ai/refactor-vnext/repo-refactor-management.md`

Goal:

- Problem being solved:
  - 完成 R2 第一项：定义 canvas2d/webgl/webgpu 共享 backend package contract，并提供最小合同测试证据。

Change Type:

- Add / Modify

Impact:

- Affected modules:
  - `packages/_vnext/renderer-shared`（新增 staging 合同包）
  - `ai/refactor-vnext/repo-refactor-management.md`（R2 任务状态回写）

Cleanup:

- Old logic to remove:
  - 无（本次仅新增合同与测试，不迁移 engine 执行逻辑）

Tests:

- Tests to add/update:
  - `pnpm dlx tsx --test packages/_vnext/renderer-shared/src/tests/rendererContractConformance.test.ts`
  - `pnpm --filter @venus/engine cr:check`
  - `pnpm --filter @venus/vector-editor-web exec tsc -p tsconfig.app.json --noEmit`
