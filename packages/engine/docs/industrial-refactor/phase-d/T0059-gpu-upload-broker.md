# T0059 GPU Upload Broker

Status: in-progress
Owner: engine/runtime

## Scope

- Arbitrate image/text/geometry upload budgets centrally.
- Reserve guaranteed capacity for critical lane.
- Apply pressure-driven backoff policy.

## Acceptance

- Peak upload stays within budget while preserving critical asset priority.

## Validation

- Upload peak pressure tests.
