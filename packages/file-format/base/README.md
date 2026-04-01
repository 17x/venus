# @venus/file-format/base

Shared FlatBuffers snapshot protocol based on Node + Feature composition.

## Layout

- `schemas/vN`: immutable schema versions
- `migrations`: step-by-step upgrades (`v1_to_v2`, `v2_to_v3`, ...)
- `samples/vN`: snapshot fixtures for regression and compatibility checks
- `src`: runtime adapters/entry points

## Rules

- Root must contain `version:uint`.
- Never remove fields, change types, or reorder fields.
- Additive-only schema evolution.
- Migrate in memory, never mutate FlatBuffers binary in place.

## Source Of Truth

- Only `schemas/v*/schema.fbs` is authoritative.
- Do not keep a separate unversioned root schema beside the versioned schemas.
- Do not commit generated TypeScript for an outdated shape model.
- If codegen is needed again, regenerate it from the current versioned schema only.

## Current Model

- v1-v2 still contain older `rootElements` compatibility data.
- v3+ moves toward a unified `Node + Features` runtime structure.
- v4 is the current target for production migration and validation.
