# T0066 Incremental Visibility Index

Status: in-progress
Owner: engine/runtime

## Scope

- Incrementally update spatial index and prioritize viewport window queries.
- Delay non-visible work under pressure.

## Acceptance

- Query latency remains bounded in 300k+ roam paths.

## Validation

- Query throughput pressure tests.
