# `@venus/runtime`

Framework-agnostic runtime core for Venus editor surfaces.

## Owns

- worker bridge and lifecycle
- editor/viewer runtime controllers
- viewport state and matrix math
- gesture/input plumbing
- extensibility contracts

## Does Not Own

- React hooks or components
- opinionated presets
- shared editor interaction policies such as marquee or snapping

Use this package when the code should stay portable across React, tests, and
future framework adapters.
