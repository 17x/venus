# Venus AI Highest-Level Enforcement Standard

Status: Active, mandatory, blocking
Version: 1.2.3
Owner: Repository governance

## 0. System Position

This is the top-priority AI engineering standard in this repository.
Any AI-generated change is invalid unless it satisfies this document.

Priority order:

1. This document
2. Repository hard instruction files
3. Package/app local conventions
4. General best practices

Conflict rule:

- If rules conflict, follow stricter rule.
- If ambiguity remains, choose the smallest safe change and document assumptions.

## 1. Mandatory Execution Protocol

AI must execute exactly in this order for each non-trivial change:

1. Scope Definition
2. Type Definition
3. CHANGE REQUEST
4. Test Design
5. Implementation
6. Validation
7. Cleanup Check

No skipping allowed.
No direct implementation before CHANGE REQUEST.

## 2. CHANGE REQUEST Template (Required)

Use this structure in planning artifacts or task notes before code edits:

[CHANGE REQUEST]

Target:

- File / Module:

Goal:

- Problem being solved:

Change Type:

- Add / Modify / Remove

Impact:

- Affected modules:

Cleanup:

- Old logic to remove:

Tests:

- Tests to add/update:

## 3. Structural Hard Constraints

Layer boundary is strict and follows a DAG, not a single chain.

Allowed dependency edges:

- `app -> editor-primitive`
- `app -> engine`
- `app -> lib`
- `editor-primitive -> lib`
- `engine -> lib`

Rules:

- No reverse dependency.
- No cross-layer private import.
- `editor-primitive -> engine` direct package dependency is forbidden; use app adapter contracts.
- One module, one responsibility.
- No parallel implementation tracks (`v2`, `new`, `temp`, side-by-side migrations).

## 4. Type and Contract Constraints

- TypeScript strict mode required.
- `any` is forbidden.
- All exported functions need explicit parameter/return types.
- Domain contracts must be defined before behavior implementation.
- Prefer discriminated unions for variant domain models.
- Public contract edits require declaration-level and field-level comments.
- All TypeScript `type`/`interface` declarations in AI-touched code require explicit semantic comments.
- All parameters of new or modified TypeScript functions in AI-touched code require JSDoc `@param` comments.
- Equivalent nearby parameter comments are not accepted as a replacement for JSDoc `@param`.

### 4.1 Mandatory Comment Coverage (Blocking)

- Comments must optimize for clarity: explain intent, key decisions, invariants, and data-flow boundaries.
- Function-level intent comments are mandatory for new or modified functions.
- Line-by-line comments are optional and should be used only when dense logic needs extra guidance.
- Non-obvious branches, fallbacks, cache/state transitions, thresholds, and compatibility guards must include explicit rationale comments.
- Placeholder comments without semantic explanation are invalid.

## 5. Function and Behavior Constraints

Function default:

- Pure by default.
- No input mutation.
- No hidden global state.

Naming constraints:

- createXxx
- getXxx
- computeXxx
- applyXxx
- handleXxx

Behavior guarantees:

- Contract safety: no undeclared side effects.
- Determinism: same input, same output.
- Snapshot consistency for rendering/output paths.

## 6. Cleanup-First Rule

AI cannot only add code.
Each accepted change must:

- Remove replaced logic, or
- Keep total complexity flat with clear replacement boundaries.

Forbidden:

- Patch-style accumulation
- Dead compatibility leftovers without removal criteria

Temporary logic rule:

- Any temporary workaround/guard/fallback must include:
  - `AI-TEMP: <why>; remove when <condition>; ref <task/doc>`

## 7. File and Module Constraints

Forbidden generic names:

- utils.ts
- helpers.ts
- common.ts
- temp.ts
- \*V2.ts
- \*New.ts

Rules:

- Semantic file names only.
- One file, one responsibility.
- Split when a file trends to multiple responsibilities.

### 7.1 File Split Trigger Rules (Mandatory)

AI must split files when any trigger is met:

- Soft trigger: file approaches 500 lines and already contains more than one responsibility.
- Hard trigger: file exceeds 600 lines (except generated files).
- Structural trigger: one file mixes mechanism + product policy, or data contract + orchestration + UI composition.

AI must not defer a hard trigger split unless the user explicitly asks for temporary deferral.

### 7.2 Split Execution Rules

When splitting a file, AI must:

- Split by responsibility boundary, not by random chunk size.
- Preserve external behavior and public API compatibility (unless CHANGE REQUEST says API change).
- Keep ownership boundaries intact (do not move product policy into runtime/engine layers).
- Replace old logic references and remove dead code in the same change.
- Add/adjust comments in extracted modules to keep comment coverage equivalent to the source file.

### 7.3 Forbidden Split Patterns

The following split patterns are invalid:

- Creating placeholder dump files (`misc`, `helpers`, `temp`, `new`, `v2`) to bypass responsibility design.
- Keeping long-lived dual implementations after extraction.
- Splitting only for file length while preserving mixed responsibilities.

### 7.4 Post-Split Validation Checklist

Every split change must verify:

- Import graph is clean (no reverse dependency, no deep private import).
- Typecheck passes.
- Lint passes.
- Relevant tests pass and are updated if file boundaries changed.
- Old file path no longer contains removed responsibilities.

### 7.5 Same-Name File Family Folder Rule (Mandatory)

Rule:

- When multiple files share the same stem (for example: `a.ts`, `a.d.ts`, `a.test.ts`), AI must place them inside a directory named by that stem (for example: `a/a.ts`, `a/a.d.ts`, `a/a.test.ts`).
- New file additions must follow this layout directly; avoid creating flat same-stem sibling files in the parent directory.
- During safe refactors, existing same-stem families should be migrated to the stem directory layout in the same change to reduce scattering and improve discoverability.

## 8. Verification Gate

Each change must pass:

- Type check
- Lint check
- Test execution
- Snapshot diff checks where output behavior exists

Failure policy:

- Any failed check blocks merge.
- Any blocked gate must be fixed before further feature edits.

## 9. Engineering OS Enforcement

Enforcement surfaces:

- File system boundaries define responsibility.
- Type system blocks illegal contracts.
- Lint rules block duplication/cycles/dead code.
- Tests enforce contract/determinism/snapshot/integration.
- CI is merge gate.

## 10. Anti-Failure Design

- No free errors: compile/test/CI failures always block.
- AI freedom is bounded by protocol + structure + validation.
- Deletion-first is mandatory for long-lived code health.

## 11. Acceptance Definition

A change is valid only if all are true:

1. Protocol order followed.
2. CHANGE REQUEST exists.
3. Ownership/layer constraints preserved.
4. Cleanup completed.
5. Validation passed.
6. Complexity not increased by parallel legacy logic.
7. File split rules were satisfied when split triggers existed.

If any item fails, the change is rejected.

## 12. AI Refactor Execution Cadence (Global)

This section defines the mandatory AI execution cadence for large refactors and split-heavy work.

### 12.1 Baseline Gate (Once Per Session)

Before split-heavy edits, AI must capture one baseline:

- Typecheck baseline
- Relevant test baseline
- File-shape guard baseline

AI must not rerun full baseline checks after every patch unless a high-risk gate requires it.

### 12.2 Batch Size Rule

AI must execute refactors in bounded batches:

- 2-4 patches per batch, or
- 80-150 net changed lines per batch

At batch end, run validation according to risk tier.

### 12.3 Risk-Tier Validation Rule

Each batch must be classified and validated by risk:

- Low risk (comments/types-only/extraction with no behavior change): typecheck only.
- Medium risk (state wiring/diagnostics composition/strategy input plumbing): typecheck + targeted tests.
- High risk (render path/budget/fallback/interaction loop changes): typecheck + targeted tests + focused regression tests.

### 12.4 Stage Gates

AI must enforce stage gates in order:

1. Structure gate: extraction compiles (typecheck pass).
2. Behavior gate: relevant targeted tests pass.
3. Governance gate: changed-scope file-shape guard reflects expected state.

AI must fix failing gates before starting the next behavioral batch.

### 12.5 Full Validation Frequency

Full validation (broad tests + all-scope guard) is required:

- At milestone completion of a major file split, and
- At final handoff.

AI should avoid full validation after every patch unless a high-risk regression indicates systemic breakage.

### 12.6 Two-Loop Execution Mode (Required)

AI must run validation in two loops to reduce repeated heavy checks while preserving safety.

Loop A: Fast Loop (default during active editing)

- Trigger: every implementation batch.
- Scope: changed package/module only.
- Commands (example):
  - `pnpm --filter @venus/engine exec tsc --noEmit`
  - `pnpm governance:file-shape -- --changed --scope engine`
  - Targeted tests for touched paths only.
- Goal: catch local regressions early with minimal wall-clock cost.

Loop B: Release Loop (milestone or handoff)

- Trigger: milestone boundary, architecture-sensitive completion, or final handoff.
- Scope: broad/whole-repo checks as required by impacted boundaries.
- Commands (example):
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm test` (or explicitly documented equivalent broad suites)
  - `pnpm governance:file-shape` and `pnpm governance:check`
- Goal: enforce full merge confidence once per milestone/handoff, not after each micro-patch.

Blocking rule:

- If Loop A fails, AI must fix before next behavior batch.
- If Loop B fails, AI must fix before declaring completion.

### 12.7 Latency Budget and Command Batching (Required)

To avoid avoidable latency inflation:

- AI must batch related edits before running heavy commands.
- AI should avoid rerunning unchanged broad suites multiple times in one small edit cycle.
- AI must prefer scoped validation first, then escalate only when risk or boundary spread increases.
- AI must include in handoff which loop was last executed.
