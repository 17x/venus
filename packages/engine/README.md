# `@venus/engine`

Framework-agnostic render engine layer for Venus.

## Owns

- renderer adapter contracts (`canvas2d`, `webgl`)
- engine frame scheduling and diagnostics contracts
- text/image/clip render node contracts
- frame-time and animation primitives

## Does Not Own

- persisted file-format semantics
- editor command/history protocols
- framework UI adapters

Use this package as the rendering engine foundation, while `@venus/runtime`
remains the editor runtime bridge.

## API Families

- `renderer`: backend-agnostic renderer contracts and diagnostics
- `scene`: renderable node model for text, text runs, image, and clipping
- `time`: frame-clock contract and system clock
- `animation`: lightweight animation controller with pluggable easing
- `worker-mode`: capability detection and fallback policy selection

## Public API Policy

- Root export (`@venus/engine`) is the stable app/runtime-facing API surface.
- Low-level worker bridge/protocol implementation stays internal to the package
  for now so consumer API remains small.
- Runtime/app layers should use `resolveEngineWorkerMode(...)` instead of
  re-implementing SAB/worker capability checks.

## Included Runtime Pieces

- `createCanvas2DEngineRenderer`: built-in canvas2d renderer for standalone usage
- `createEngineLoop`: minimal frame loop controller (`start/stop/renderOnce`)
- `resolveEngineWorkerMode`: unified fallback policy
  (`main-thread` / `worker-postmessage` / `worker-shared-memory`)

## Typical Integration Steps

1. Build engine scene snapshot (`EngineSceneSnapshot`)
2. Create renderer (`createCanvas2DEngineRenderer`)
3. Create clock (`createSystemEngineClock`)
4. Drive rendering with `createEngineLoop`
5. (Optional) use `resolveEngineWorkerMode` to pick worker path/fallback

## Minimal Example

```ts
import {
  createCanvas2DEngineRenderer,
  createEngineLoop,
  createSystemEngineClock,
} from '@venus/engine'

const canvas = document.querySelector('canvas') as HTMLCanvasElement
const clock = createSystemEngineClock()
const renderer = createCanvas2DEngineRenderer({ canvas })

const loop = createEngineLoop({
  clock,
  renderer,
  resolveFrame: () => ({
    scene: {
      revision: 1,
      width: 800,
      height: 600,
      nodes: [
        {
          id: 'title',
          type: 'text',
          x: 80,
          y: 100,
          style: { fontFamily: 'sans-serif', fontSize: 28, fill: '#111' },
          text: 'Engine Ready',
        },
      ],
    },
    viewport: {
      viewportWidth: 800,
      viewportHeight: 600,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    },
    context: {
      quality: 'full',
    },
  }),
})

loop.start()
```
