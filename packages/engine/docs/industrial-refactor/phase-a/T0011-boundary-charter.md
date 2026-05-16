# T0011 Boundary Charter

Status: In Progress

## Goal

Define hard package boundaries between app, runtime, engine, and lib.

## Ownership Split

- `app`: product workflow and UX policy
- `engine`: rendering/runtime strategy and performance contracts
- `lib`: shared primitives and generic helpers

## Allowed Dependencies

- `app -> engine`
- `app -> lib`
- `engine -> lib`

## Forbidden Dependencies

- `engine -> app`
- `lib -> engine`
- `lib -> app`

## Validation Rule

- Import graph must fail on forbidden edges.

## Evidence

- `engine-module-boundaries.md` and governance checks define directional policy.
