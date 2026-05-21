# @venus/runtime Public API (Proposed)

Status: Proposed contract (package not created yet)
Related plan: `ai/refactor-vnext/repo-refactor-management.md`

## Purpose

`@venus/runtime` should expose platform/runtime host abstractions used by engine and apps.

## Proposed Public Contracts

### `RuntimeAdapter`

- `requestFrame(callback)`
- `cancelFrame(handle)`
- `now()`
- `createCanvasSurface?(options)`
- `createWorker?(url)`
- `setCursor?(cursor)`

### `RuntimeInputAdapter`

- pointer/touch normalization
- wheel normalization
- keyboard modifier state
- IME integration hooks

### `RuntimeStorageAdapter`

- `getItem(key)`
- `setItem(key, value)`
- `removeItem(key)`

### `RuntimeClipboardAdapter`

- `readText()`
- `writeText(value)`

### `RuntimeFileSystemAdapter` (optional)

- open/save/persist hooks for host platform

## Compatibility Notes

- `@venus/runtime` must not depend on `@venus/engine` internals.
- Browser/Node/Electron specifics belong to platform packages that implement these contracts.
