# T0047 Hybrid Auto Policy

Status: in-progress
Owner: engine/runtime

## Scope

- Auto-switch profile tendency by interaction mode.
- Add hysteresis and cooldown to avoid oscillation.
- Persist switch trace in diagnostics for replay analysis.

## Acceptance

- Profile switching remains stable and measurable under mixed workflows.

## Validation

- Hybrid mode replay tests.
- Hysteresis and cooldown determinism tests.
