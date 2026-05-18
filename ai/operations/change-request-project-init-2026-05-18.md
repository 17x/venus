# CHANGE REQUEST — Project Init And Structure Optimization (2026-05-18)

## 1) Scope Definition

- Target: root workspace initialization flow and immediate governance/typecheck blocker.
- In scope:
  - Root script wiring for one-command initialization with governance checks.
  - Fix current `typecheck` blocker in vector runtime engine bridge.
  - README initialization instructions alignment.
- Out of scope:
  - Large engine renderer file split for pre-existing hard-limit debt.

## 2) Type Definition

- No public type contract semantic change is planned.
- Only import wiring and root script/docs updates are planned.

## 3) CHANGE REQUEST

[CHANGE REQUEST]

Target:

- File / Module:
  - `apps/vector-editor-web/src/runtime/engine-bridge/engine.ts`
  - `package.json`
  - `README.md`

Goal:

- Problem being solved:
  - `pnpm typecheck` currently fails on unused type imports.
  - Workspace lacks an explicit, documented one-command initialization path aligned with governance checks.

Change Type:

- Add / Modify / Remove:
  - Modify imports to remove unused symbols.
  - Add initialization script entry.
  - Modify README with initialization command.

Impact:

- Affected modules:
  - Root workspace scripts and docs.
  - Vector runtime engine bridge import declarations.

Cleanup:

- Old logic to remove:
  - Redundant type imports no longer needed.

Tests:

- Tests to add/update:
  - No new test files.
  - Validation via `pnpm typecheck`, `pnpm governance:check`, and `pnpm governance:file-shape`.

## 4) Test Design

- Execute:
  - `pnpm typecheck`
  - `pnpm governance:check`
  - `pnpm governance:file-shape`
- Accept when:
  - Typecheck passes.
  - Governance checks pass for changed scope.

## 5) Implementation

- Follow minimal-change edits only.

## 6) Validation

- Run the command set in Test Design and record outcomes.

## 7) Cleanup Check

- Confirm no temporary compatibility branch was introduced.
- Confirm no duplicate scripts or conflicting init docs remain.
