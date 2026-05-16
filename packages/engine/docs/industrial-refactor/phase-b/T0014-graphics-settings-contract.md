# T0014 Graphics Settings Contract

Status: In Progress

## Fields

- `renderScale`: normalized rendering scale factor
- `maxFps`: target frame cap
- `antiAliasing`: abstract AA mode (`off`, `fxaa`, `msaa`)

## Rules

- Invalid ranges are rejected by validator.
- Contract remains user-facing and backend-agnostic.

## Tests

- schema boundary tests for renderScale and maxFps.
