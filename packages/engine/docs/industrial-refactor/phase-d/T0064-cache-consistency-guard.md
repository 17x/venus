# T0064 Cache Consistency Guard

Status: in-progress
Owner: engine/runtime

## Scope

- Add phase factor and DPR isolation into cache key guard.
- Align invalidation between phase switches and scale-class changes.

## Acceptance

- No incorrect cache reuse after phase or DPR transitions.

## Validation

- Cache key regression tests.
