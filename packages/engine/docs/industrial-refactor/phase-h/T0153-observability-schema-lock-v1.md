# T0153 Observability Schema Lock V1

Status: in-progress
Owner: engine/runtime

## Scope

- Lock observability schema to prevent accidental field drift.

## Acceptance

- Schema lock detects missing or renamed mandatory fields.

## Validation

- Run schema mismatch cases and verify lock failures.
