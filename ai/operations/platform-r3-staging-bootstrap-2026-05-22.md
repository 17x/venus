# Platform R3 Staging Bootstrap (2026-05-22)

[CHANGE REQUEST]

Target:

- File / Module:
  - `packages/_vnext/platform-browser/**`
  - `packages/_vnext/platform-node/**`
  - `ai/refactor-vnext/repo-refactor-management.md`

Goal:

- Problem being solved:
  - 推进 R3 前两项：落地 `platform-browser` 与 `platform-node` staging 包，为 DOM/browser 与 headless/test 适配边界提供可执行起点。

Change Type:

- Add / Modify

Impact:

- Affected modules:
  - `_vnext` platform staging packages
  - repo refactor checklist evidence

Cleanup:

- Old logic to remove:
  - 无（staging bootstrap）

Tests:

- Tests to add/update:
  - `pnpm dlx tsx --test packages/_vnext/platform-browser/src/tests/browserPlatformAdapters.contract.test.ts`
  - `pnpm dlx tsx --test packages/_vnext/platform-node/src/tests/nodePlatformAdapters.contract.test.ts`
  - `pnpm --filter @venus/engine cr:check`
  - `pnpm --filter @venus/vector-editor-web exec tsc -p tsconfig.app.json --noEmit`
