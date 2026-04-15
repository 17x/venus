# Testing Strategy

## Validation Baseline

- Run `pnpm typecheck` for type safety.
- Run `pnpm lint` for static quality checks.
- Run `pnpm build` for integration sanity.

## Product Verification

- Verify architecture-sensitive changes in both:
  - `apps/vector-editor-web`
  - `apps/playground`

## Known Constraint

- `pnpm test` is currently placeholder-only.

## Regression Focus Areas

- Transform interactions (move/scale/rotate)
- Hit-test selection semantics (group vs deep selection)
- Command/history reversibility
- Runtime/engine boundary integrity
