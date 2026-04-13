# `@venus/runtime`

Framework-agnostic runtime core for Venus editor surfaces.

## Positioning

Use this package as the runtime mechanism layer between app UI and
worker/renderer packages.

Primary chain:

`apps/* -> @venus/runtime -> @venus/runtime/worker + @venus/shared-memory -> renderer packages`

## Owns

- worker bridge and lifecycle
- editor/viewer runtime controllers
- viewport state and matrix math
- frame-time and animation primitives
- extensibility contracts

## Does Not Own

- React hooks or components
- opinionated presets
- shared editor interaction policies such as marquee or snapping
- product UI workflows and panel/menu behavior

## API Surface

### Runtime lifecycle

- `createCanvasRuntimeController`
- `createCanvasEditorInstance`
- `createCanvasViewerController`
- `createCanvasViewerInstance`

### Module/extensibility

- `createCanvasModuleRunner`
- `createCanvasElementRegistry`

### Viewport and math

- `resolveViewportState`
- `panViewportState`
- `zoomViewportState`
- `fitViewportToDocument`
- `applyMatrixToPoint`

### Time and animation bridge

- `createSystemRuntimeClock`
- `createAnimationController`

These exports forward to `@venus/engine` so existing runtime consumers can
migrate incrementally without an immediate import-surface break.

## Minimal Example

```ts
import {
  createAnimationController,
  createSystemRuntimeClock,
} from "@venus/runtime";

const clock = createSystemRuntimeClock();
const animations = createAnimationController();

const id = animations.start({
  from: 1,
  to: 1.15,
  duration: 140,
  easing: "easeOut",
  onUpdate: (scale) => {
    // apply scale to viewport or interaction preview state
  },
});

let frame = 0;
const tick = () => {
  frame = clock.requestFrame((info) => {
    animations.tick(info);
    tick();
  });
};

tick();

// later:
animations.stop(id);
clock.cancelFrame(frame);
```

## Boundary Rules

- Keep this package framework-agnostic
- Put policy defaults in `@venus/runtime/presets`
- Put shared interaction algorithms in `@venus/runtime/interaction`
- Keep persisted document semantics in `@venus/document-core`
