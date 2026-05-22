# Renderer R2 Engine Adapter Bridge Extraction (2026-05-22)

[CHANGE REQUEST]

Target:

- File / Module:
  - `packages/engine/src/adapters/backend/canvas2dBackendAdapter.ts`
  - `packages/engine/src/adapters/backend/webglBackendAdapter.ts`
  - `packages/engine/src/adapters/backend/webgpuBackendAdapter.ts`
  - `packages/engine/src/testing/webAdapter.conformance.test.ts`
  - `ai/refactor-vnext/repo-refactor-management.md`

Goal:

- Problem being solved:
  - 完成 R2 第三项的最小迁移切片：将 engine backend adapter 的执行实现桥接到 `_vnext` renderer 包，保持 engine backend selector/facade/policy 语义不变。

Change Type:

- Modify

Impact:

- Affected modules:
  - engine backend adapter bridge layer
  - R2 checklist evidence in repo refactor management

Cleanup:

- Old logic to remove:
  - engine adapter 内部重复的 backend execution 实现细节，替换为 `_vnext` 执行合同桥接。

Tests:

- Tests to add/update:
  - `pnpm --filter @venus/engine exec node --import tsx --test src/testing/webAdapter.conformance.test.ts`
  - `pnpm --filter @venus/engine exec tsc -p tsconfig.json --noEmit`
  - `pnpm --filter @venus/engine cr:check`
  - `pnpm --filter @venus/vector-editor-web exec tsc -p tsconfig.app.json --noEmit`
