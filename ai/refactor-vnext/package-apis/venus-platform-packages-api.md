# Platform Packages Public APIs (Proposed)

Status: Proposed contracts (packages not created yet)
Related plan: `ai/refactor-vnext/repo-refactor-management.md`

## Target Packages

- `@venus/platform-browser`
- `@venus/platform-node`
- `@venus/platform-electron` (optional future)

## Shared Platform Contract (Proposed)

### `PlatformRuntimeBridge`

- `createSurface(options)`
- `createWorkerBridge(options)`
- `resolveNow()`
- `requestFrame(callback)`
- `cancelFrame(handle)`

### `PlatformInputBridge`

- event source wiring
- pointer/touch/keyboard normalization handoff
- focus/IME bridge hooks

### `PlatformSystemBridge`

- clipboard hooks
- storage hooks
- filesystem/network hooks

## Boundary Rules

- Platform packages adapt host APIs; they do not implement engine policy.
- Platform packages should remain thin wrappers around runtime contracts.
- Host-specific behavior should be hidden behind stable runtime interfaces.
