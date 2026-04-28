# @venus/editor-primitive

`@venus/editor-primitive` defines shared editor interaction contracts.

## Responsibility

- Own package-agnostic interaction runtime primitives.
- Depend only on low-level abstractions from `@venus/lib`.

## Boundary

- Must not depend on app packages.
- Must not depend on engine implementation internals.

