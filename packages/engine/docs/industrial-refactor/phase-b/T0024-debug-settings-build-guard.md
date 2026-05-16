# T0024 Debug Settings Build Guard

Status: In Progress

## Scope

- release build must not expose debug toggles by default
- debug defaults must remain false

## Guard

- CI script validates release-safe debug defaults

## Acceptance

- guard fails if release defaults are unsafe.
