# T0061 Scheduler Policy V2

Status: in-progress
Owner: engine/runtime

## Scope

- Normalize scheduler modes with single-flight and interactive throttle.
- Add coalesced request diagnostics and in-flight re-entry guard contracts.

## Acceptance

- High-frequency requests avoid render storm and keep deterministic queue behavior.

## Validation

- Scheduler pressure tests.
