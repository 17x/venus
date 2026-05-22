# Renderer R2 Shared Backend Contract Bootstrap (2026-05-22)

[CHANGE REQUEST]

Target:

- File / Module:
  - `packages/renderer-shared/package.json`
  - `packages/renderer-shared/README.md`
  - `packages/renderer-shared/src/contracts/rendererBackendContract.ts`
  - `packages/renderer-shared/src/tests/rendererContractConformance.test.ts`
  - `packages/renderer-shared/src/index.ts`
  - `ai/refactor-vnext/repo-refactor-management.md`

Goal:

- Problem being solved:
  - 完成 R2 第一项：定义 canvas2d/webgl/webgpu 共享 backend package contract，并提供最小合同测试证据。

Change Type:

- Add / Modify

Impact:

- Affected modules:
  - `packages/renderer-shared`（新增 staging 合同包）
  - `ai/refactor-vnext/repo-refactor-management.md`（R2 任务状态回写）

Cleanup:

- Old logic to remove:
  - 无（本次仅新增合同与测试，不迁移 engine 执行逻辑）

Tests:

- Tests to add/update:
  - `pnpm dlx tsx --test packages/renderer-shared/src/tests/rendererContractConformance.test.ts`
  - `pnpm --filter @venus/engine cr:check`
  - `pnpm --filter @venus/vector-editor-web exec tsc -p tsconfig.app.json --noEmit`
