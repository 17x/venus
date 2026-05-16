# T0058 Partial Redraw V2

Status: in-progress
Owner: engine/runtime

## Scope

- Define dirty-region lifecycle from enqueue to cleanup.
- Merge dirty regions with phase-aware thresholds.
- Define fallback conditions for full redraw.

## Acceptance

- Small-region updates reduce draw cost with correctness preserved.

## Validation

- Dirty-region correctness and fallback tests.
