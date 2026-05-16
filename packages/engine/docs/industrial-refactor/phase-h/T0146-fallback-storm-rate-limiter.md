# T0146 Fallback Storm Rate Limiter

Status: in-progress
Owner: engine/runtime

## Scope

- Limit repeated fallback storms during sustained pressure windows.

## Acceptance

- Rate limiter throttles burst fallback events while preserving critical layers.

## Validation

- Stress fallback stream and verify throttling behavior.
