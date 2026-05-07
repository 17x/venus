# vector-editor-web scripts

This directory contains operational scripts for quality gates and diagnostics.

## Keep

- `ui-style-guard.mjs` - lint pipeline gate, required by `package.json` `lint` script.
- `perf-gate.mjs` - performance gate checker used by `perf:gate` commands.
- `perf-gate.config.json` - threshold config consumed by `perf-gate.mjs`.
- `perf-gate.report.template.json` - baseline input for template gate runs.
- `boolean-contour-regression.ts` - geometry regression checks for boolean/contour paths.
- `playwright-fps-check.mjs` - optional FPS diagnostics script.

## Do Not Commit

- Generated run outputs (for example `*.result.json`) should stay local CI/workspace artifacts.

## Usage

```zsh
pnpm --filter @venus/vector-editor-web lint
pnpm --filter @venus/vector-editor-web perf:gate
pnpm --filter @venus/vector-editor-web regression:boolean-contour
pnpm --filter @venus/vector-editor-web perf:fps:playwright
```

