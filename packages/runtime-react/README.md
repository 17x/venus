# `@venus/runtime-react`

React adapter layer for the Venus runtime stack.

## Owns

- `useCanvasRuntime`
- `useCanvasViewer`
- `CanvasViewport`
- shared React overlay helpers
- renderer-facing React component contracts

## Does Not Own

- runtime core lifecycle
- shared interaction algorithms
- opinionated presets

Use this package when wiring the runtime into React apps and renderer
components.
