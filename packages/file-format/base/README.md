# @venus/file-format/base

Shared JSON scene/document model based on Node + Feature composition.

## Layout

- `src/types.ts`: JSON runtime scene contracts
- `src/parseRuntimeScene.ts`: scene-to-document adapter
- `src/index.ts`: minimal public exports for runtime adapters

## Rules

- Root payload must contain `version`.
- Prefer additive schema evolution for compatibility.
- Keep persisted JSON model separate from engine runtime buffers.

## Current Model

- JSON `RuntimeSceneV5` (`RuntimeSceneLatest`) is the active model.
- Runtime import/export adapters use typed JSON payloads directly.
- Legacy versioned types are still exposed for compatibility handling.
