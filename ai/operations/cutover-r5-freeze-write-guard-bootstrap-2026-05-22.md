# Cutover R5 Freeze Write Guard Bootstrap (2026-05-22)

[CHANGE REQUEST]

Target:

- File / Module:
  - `scripts/cutover-freeze-guard.mjs`
  - `ai/refactor-vnext/cutover-freeze-roots.json`
  - `package.json`
  - `ai/refactor-vnext/repo-refactor-management.md`

Goal:

- Problem being solved:
  - 完成 R5 第一项：建立“old package 写入冻结”执行守卫，在 cutover 前后可直接运行并阻断受保护目录写入。

Change Type:

- Add / Modify

Impact:

- Affected modules:
  - repo governance scripts
  - cutover governance configuration

Cleanup:

- Old logic to remove:
  - 无

Tests:

- Tests to add/update:
  - `pnpm governance:cutover-freeze`
  - `pnpm --filter @venus/engine cr:check`
  - `pnpm --filter @venus/vector-editor-web exec tsc -p tsconfig.app.json --noEmit`
