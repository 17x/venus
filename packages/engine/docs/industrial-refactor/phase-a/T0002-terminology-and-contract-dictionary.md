# T0002 Terminology and Contract Dictionary

Status: In Progress

## Unified Terms

- `profile`: scenario-level strategy package (`editor`, `game`, `animation`, `medical`, `massive-data`, `hybrid`)
- `phase`: runtime interaction state (`interactive`, `settling`, `static`, `camera`)
- `pressure`: observed runtime stress level from CPU/GPU/memory/streaming signals
- `budget`: per-frame resource allowance for draw/upload/cache/tile/worker/frame-time
- `fallback`: explicit degraded path chosen due to pressure or capability constraints
- `critical-layer`: semantics that must never be degraded (selection anchors, medical key structures, diagnostic annotations)

## Legacy Mapping (Old -> New)

- interaction mode -> phase
- perf level -> pressure
- frame limit knobs -> budget controls
- quality downgrade -> fallback reason

## Contract Rule

- One concept, one canonical name.
- Runtime contracts and settings documents must use canonical names only.
