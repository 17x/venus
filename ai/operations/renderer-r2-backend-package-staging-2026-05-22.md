# Renderer R2 Backend Package Staging (2026-05-22)

[CHANGE REQUEST]

Target:

- File / Module:
  - `packages/renderer-canvas2d/**`
  - `packages/renderer-webgl/**`
  - `packages/renderer-webgpu/**`
  - `packages/renderer-shared/src/contracts/rendererBackendContract.ts`
  - `ai/refactor-vnext/repo-refactor-management.md`

Goal:

- Problem being solved:
  - 完成 R2 第二项：在存在可迁移真实 backend 执行代码前提下，分阶段创建 `renderer-canvas2d`、`renderer-webgl`、`renderer-webgpu` staging 包。

Change Type:

- Add / Modify

Impact:

- Affected modules:
  - `_vnext` renderer staging packages and shared contract utilities
  - repo refactor management checklist

Cleanup:

- Old logic to remove:
  - 无（本次为 staged extraction；不改 engine 现有执行链路）

Tests:

- Tests to add/update:
  - `pnpm dlx tsx --test packages/renderer-canvas2d/src/tests/canvas2dBackendExecution.contract.test.ts`
  - `pnpm dlx tsx --test packages/renderer-webgl/src/tests/webglBackendExecution.contract.test.ts`
  - `pnpm dlx tsx --test packages/renderer-webgpu/src/tests/webgpuBackendExecution.contract.test.ts`
  - `pnpm --filter @venus/engine cr:check`
  - `pnpm --filter @venus/vector-editor-web exec tsc -p tsconfig.app.json --noEmit`
