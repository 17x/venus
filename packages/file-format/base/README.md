# @venus/file-format/base

Shared FlatBuffers protocol module based on Node + Feature composition.

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
