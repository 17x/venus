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

## Performance Regression Gate

- Mixed-scene gate command:
  - `pnpm --filter @venus/vector-editor-web perf:gate --report ./scripts/perf-gate.report.template.json`
- Trend regression gate command (compare against previous report):
  - `pnpm --filter @venus/vector-editor-web perf:gate --report ./scripts/perf-gate.report.template.json --previous-report ./scripts/perf-gate.report.template.json --output ./scripts/perf-gate.result.json`
- Config location:
  - `apps/vector-editor-web/scripts/perf-gate.config.json`
- Script location:
  - `apps/vector-editor-web/scripts/perf-gate.mjs`
- Optional machine-readable output:
  - `--output <result.json>` writes checks/failures/trendChecks for CI parsing
- The gate validates baseline scenes (`10k`, `50k`, `100k`, `mixed(text/image/path)`) against metrics:
  - frame time (p95)
  - hit-test time (p95)
  - cache hit-rate
  - visible candidate count

## Targeted Checklist

- Transform/hit-test overlap checklist:
  - `docs/core/transform-hit-test-regression-checklist.md`
