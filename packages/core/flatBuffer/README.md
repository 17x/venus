# FlatBuffers Protocol Rules

This folder contains the long-term data protocol for editor snapshots.

## Contract

- `version:uint` is the only schema version marker.
- Every root table must include `version`.
- Old schema files are immutable once published.
- FlatBuffers binary is snapshot storage only.
- Runtime state is mutable and migrated in memory before serialization.

## Folder Structure

```text
flatBuffer/
  schemas/
    v1/
      schema.fbs
      CHANGELOG.md
    v2/
      schema.fbs
      CHANGELOG.md
  migrations/
    types.ts
    v1_to_v2.ts
    index.ts
```

## Evolution Rules

- Allowed:
  - add fields with defaults
  - add new tables/unions
- Forbidden:
  - remove fields
  - change field types
  - reorder fields

## Migration Rules

- Upgrade step-by-step only.
- No direct `v1 -> vN` jump.
- One dedicated function per transition (`v1_to_v2`, `v2_to_v3`, ...).
- Migrations run on runtime objects, never on binary.

## Unified Node + Features (v3+)

- Keep a single composable `Node` structure:
  - `id`
  - `type` (coarse classification)
  - `transform`
  - `children`
  - `features`
- Node behavior comes from attached feature union entries, not deep node inheritance.
- Runtime validation enforces legal feature combinations per node type.

## Production Model (v4)

- Single unified runtime node contract:
  - `id:string`
  - `type`
  - `transform:Mat3`
  - `children:[Node]`
  - `features:[Feature]`
- Feature union includes:
  - Fill, Stroke, Layout, Constraint, Text, Vector, Image, Effect
- Auto layout supports simplified flex behavior with:
  - direction, axis sizing, gap, padding, alignment, justification
  - size modes (`FIXED`, `HUG`, `FILL`)
- Text supports mixed styles via `runs`.
- Vector supports command-based paths (move/line/curve/close), not SVG strings.
- Images are referenced by ID only, never embedded as binary.
