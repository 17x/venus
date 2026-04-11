# `@venus/runtime-presets`

Out-of-box default behavior packs for the Venus runtime stack.

## Owns

- modular runtime policy presets:
  - `selection`
  - `snapping`
  - `history`
  - `protocol`
- optional default module bundle helpers

## Does Not Own

- framework adapters
- runtime lifecycle
- product-specific workflows

Use this package for opinionated defaults, while keeping core runtime
mechanism separate from behavior policy.

## Import Style

- granular imports:
  - `@venus/runtime-presets/selection`
  - `@venus/runtime-presets/snapping`
  - `@venus/runtime-presets/history`
  - `@venus/runtime-presets/protocol`
- optional bundled defaults:
  - `@venus/runtime-presets/default`
  - `createDefaultRuntimeModules(...)`
