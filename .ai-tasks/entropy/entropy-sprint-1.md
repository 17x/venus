# Entropy Sprint 1

Generated from: .ai-tasks/entropy/entropy-metrics.json
Generated at: 2026-05-25T09:03:37.354Z

## Scope

- Target top 5 hard-limit files by line count.
- Keep mutation radius inside each owning module.
- No behavior changes unless explicitly required by tests/contracts.

## Goals

1. Reduce hard-limit file count by at least 3 files.
2. Ensure every extracted file has explicit ownership intent comments.
3. Preserve governance check compatibility for touched scope.

## Backlog

### Task 1

- Target file: apps/vector-editor-web/src/testing/product-specs/rendering/render-parity-runtime-replay-history-gate.contract.test.ts
- Current line count: 2498
- Action: split by ownership boundary into 2-4 cohesive modules.
- Guardrails: preserve public contracts and remove replaced code in same batch.
- Validation: pnpm governance:file-shape -- --changed && pnpm governance:check

### Task 2

- Target file: packages/engine/src/testing/webAdapter.conformance.test.ts
- Current line count: 1224
- Action: split by ownership boundary into 2-4 cohesive modules.
- Guardrails: preserve public contracts and remove replaced code in same batch.
- Validation: pnpm governance:file-shape -- --changed && pnpm governance:check

### Task 3

- Target file: apps/vector-editor-web/src/runtime/templatePresets/generators/generators.ts
- Current line count: 1155
- Action: split by ownership boundary into 2-4 cohesive modules.
- Guardrails: preserve public contracts and remove replaced code in same batch.
- Validation: pnpm governance:file-shape -- --changed && pnpm governance:check

### Task 4

- Target file: packages/engine/src/orchestration/api/createEngine.runtime-document-dirty-command.foundation.ts
- Current line count: 912
- Action: split by ownership boundary into 2-4 cohesive modules.
- Guardrails: preserve public contracts and remove replaced code in same batch.
- Validation: pnpm governance:file-shape -- --changed && pnpm governance:check

### Task 5

- Target file: packages/engine/src/orchestration/api/createEngine.ts
- Current line count: 879
- Action: split by ownership boundary into 2-4 cohesive modules.
- Guardrails: preserve public contracts and remove replaced code in same batch.
- Validation: pnpm governance:file-shape -- --changed && pnpm governance:check

## Risk Controls

- AI-TEMP current count: 16
- Wrapper-like filename count: 10
- Any new AI-TEMP requires explicit burn-down owner and removal condition.
- Do not introduce parallel implementation tracks.

## Exit Criteria

1. At least 3 targeted files reduced below hard limit (<=600 lines).
2. No new governance hard failures introduced by sprint changes.
3. Entropy dashboard regenerated and trend documented.
