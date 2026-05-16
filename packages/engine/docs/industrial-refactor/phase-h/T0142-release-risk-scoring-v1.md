# T0142 Release Risk Scoring V1

Status: in-progress
Owner: engine/runtime

## Scope

- Compute release risk score from blocker, drift, and rollback signals.

## Acceptance

- Risk score remains bounded and reproducible for identical inputs.

## Validation

- Replay identical risk inputs and verify deterministic score.
