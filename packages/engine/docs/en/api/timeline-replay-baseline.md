# Timeline And Replay Baseline

Status: Release contract draft.
Scope: ENG-006.

Timeline and replay APIs are generic deterministic primitives. They do not own video, game, driving, or editor product semantics.

## Required Concepts

- Track: ordered collection of generic events or keyframes.
- Clip: bounded time range with resource references or state deltas.
- Replay: deterministic execution of submitted graph, input, and timing records.
- Capture: diagnostic artifact for comparing runtime behavior across environments.

## Determinism Rule

Replay must be keyed by graph revision, event order, timestamps, backend profile, and scheduler policy. Browser and headless behavior must record differences as diagnostics.

## App Ownership

Apps translate video timelines, game runtime previews, driving twins, and editor history into the generic timeline/replay contract.
