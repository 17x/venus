# `@venus/runtime-react`

Package-scoped note for the React adapter layer over the Venus runtime stack.

## Stable Knowledge

- Owns hooks, viewport components, overlay components, and renderer-facing
  React contracts.
- Depends on `@venus/runtime` and `@venus/runtime-interaction`; those packages
  must not depend back on React.

## Recent Updates

### 2026-04-10

- Added the initial `packages/runtime-react` split and migrated active app and
  renderer imports to consume React-facing runtime APIs from here.

### 2026-04-11

- `useCanvasRuntime` now instantiates the editor-instance runtime path
  (`createCanvasEditorInstance`) instead of the bare controller so app hooks
  can pass runtime modules (`modules`) without rewriting app-level runtime
  orchestration.
