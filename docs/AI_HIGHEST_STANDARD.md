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

- Soft trigger: file approaches 400 lines and already contains more than one responsibility.
- Hard trigger: file exceeds 500 lines (except generated files).
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
