# CR: WebGPU JSDoc Param Alignment (2026-05-20)

[CHANGE REQUEST]

Target:

- File / Module:
  - `packages/engine/src/renderer/webgpu/webgpu.ts`

Goal:

- Problem being solved:
  - Resolve lint-blocking JSDoc contract mismatch in WebGPU stats helpers.
  - Keep engine governance and repository lint gates passable while vNext staging work continues.

Change Type:

- Modify
  - Add missing `@param bindingSummary` JSDoc tags on two existing functions.

Impact:

- Affected modules:
  - WebGPU renderer stats helper documentation only.
  - No runtime behavior or output payload shape changes.

Cleanup:

- Old logic to remove:
  - None. This CR documents a docs-contract correction.

Tests:

- Tests to add/update:
  - No functional tests required (behavior unchanged).
  - Validation gate: `pnpm lint` and `pnpm --filter @venus/engine cr:check`.
