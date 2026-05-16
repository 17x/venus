# T0016 Runtime Settings Contract

Status: In Progress

## Fields

- `retainedRendering`
- `partialRedraw`
- `progressiveRendering`

## Rules

- Legacy aliases are migrated to canonical fields.
- Deprecated fields can emit warnings via migrator layer.

## Tests

- migration compatibility tests for legacy input.
