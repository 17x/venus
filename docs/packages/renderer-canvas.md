# `@venus/renderer-canvas`

Package-scoped notes for the active Canvas2D renderer path.

## Stable Knowledge

- Canvas2D is the current default/stable renderer for active vector and
  playground work.
- Selection chrome belongs in overlay layers, not in base shape draw paths.

## Recent Updates

### 2026-04-09

- Shape rotation/flip application now uses shared affine transform composition
  from `document-core` instead of package-local rotate/scale sequencing.

- The renderer now resolves per-shape transform state through
  `document-core` `resolveNodeTransform`, so normalized bounds, center, and the
  applied Canvas2D matrix share the same compatibility contract as hit-test and
  interaction code.

- Closed path fill rendering now stays aligned with file-format `CLOSE`
  semantics.

- Fill rendering now depends on the fill toggle plus visible fill color alpha.
