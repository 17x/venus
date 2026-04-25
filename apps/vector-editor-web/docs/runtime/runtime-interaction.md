# Vector Runtime Interaction Integration

Vector app local note for `@venus/runtime/interaction` adoption.

## Stable Knowledge

- Logical import path is `@venus/runtime/interaction`.
- Interaction package owns shared editing interaction policy and adapters.
- Core mechanism helpers can live in `@venus/engine` and be wrapped by
  runtime interaction when policy adaptation is needed.

## Vector Usage Boundary

- Keep product-specific tool behavior in app layer.
- Keep framework glue in vector app bridge files.
- Reuse shared interaction policy across app surfaces instead of duplicating
  per-feature logic.

## Ownership Summary

- Runtime interaction owns reusable policy.
- Engine owns mechanism math and low-level geometry helpers.
- Vector app owns product semantics and workflow composition.