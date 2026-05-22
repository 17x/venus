# Runtime R1 Adapter Contract Bootstrap (2026-05-21)

[CHANGE REQUEST]

Target:

- File / Module:
  - `packages/_vnext/runtime/package.json`
  - `packages/_vnext/runtime/README.md`
  - `packages/_vnext/runtime/src/index.ts`
  - `packages/_vnext/runtime/src/contracts/runtimeAdapters.ts`
  - `ai/refactor-vnext/repo-refactor-management.md`

Goal:

- Problem being solved:
  - 完成 R1 首轮最小接线：定义 runtime adapter contracts，并创建 `packages/_vnext/runtime` staging 包骨架。

Change Type:

- Add / Modify

Impact:

- Affected modules:
  - vNext 规划与合同文档
  - 新增 runtime staging 包（无生产行为变更）

Cleanup:

- Old logic to remove:
  - 无（本次仅新增合同与包骨架）

Tests:

- Tests to add/update:
  - `pnpm --filter @venus/engine cr:check`
  - `pnpm --filter @venus/vector-editor-web exec tsc -p tsconfig.app.json --noEmit`
