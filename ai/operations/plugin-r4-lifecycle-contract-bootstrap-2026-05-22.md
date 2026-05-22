# Plugin R4 Lifecycle Contract Bootstrap (2026-05-22)

[CHANGE REQUEST]

Target:

- File / Module:
  - `packages/_vnext/plugin-lifecycle/**`
  - `ai/refactor-vnext/repo-refactor-management.md`

Goal:

- Problem being solved:
  - 完成 R4 第二项：在创建领域插件包前，先定义通用 plugin lifecycle contract 与 conformance test。

Change Type:

- Add / Modify

Impact:

- Affected modules:
  - `_vnext` plugin lifecycle staging contract package
  - repo refactor checklist evidence

Cleanup:

- Old logic to remove:
  - 无（新增 contract 层）

Tests:

- Tests to add/update:
  - `pnpm dlx tsx --test packages/_vnext/plugin-lifecycle/src/pluginLifecycleContract/pluginLifecycleContract.test.ts`
  - `pnpm --filter @venus/engine cr:check`
  - `pnpm --filter @venus/vector-editor-web exec tsc -p tsconfig.app.json --noEmit`
