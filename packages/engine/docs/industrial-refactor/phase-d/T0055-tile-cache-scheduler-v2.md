# T0055 Tile Cache Scheduler V2

Status: in-progress
Owner: engine/runtime

## Scope

- Define tile granularity and viewport+prediction priority.
- Add stale request cancellation and starvation prevention.

## Acceptance

- Roaming blank-region dwell decreases significantly.

## Validation

- Tile queue pressure tests.
- Starvation-prevention tests.
