# Tutorial: Draw Shapes With `@venus/engine`

This tutorial shows the shortest path from a canvas to rendered engine shapes.

## 1. Import the engine

```ts
import {createEngine, type EngineSceneSnapshot} from '@venus/engine'
```

## 2. Create a scene

```ts
const scene: EngineSceneSnapshot = {
  revision: 1,
  width: 640,
  height: 480,
  nodes: [
    {
      id: 'rect-1',
      type: 'shape',
      shape: 'rect',
      x: 40,
      y: 40,
      width: 160,
      height: 96,
      cornerRadius: 16,
      fill: '#dbeafe',
      stroke: '#2563eb',
      strokeWidth: 2,
    },
    {
      id: 'ellipse-1',
      type: 'shape',
      shape: 'ellipse',
      x: 240,
      y: 48,
      width: 120,
      height: 80,
      fill: '#fef3c7',
      stroke: '#d97706',
      strokeWidth: 2,
    },
  ],
}
```

## 3. Render it

```ts
const canvas = document.querySelector('canvas')!
const engine = createEngine({
  canvas,
  initialScene: scene,
  render: {backend: 'canvas2d'},
})

engine.resize({
  viewportWidth: canvas.clientWidth,
  viewportHeight: canvas.clientHeight,
  outputWidth: canvas.width,
  outputHeight: canvas.height,
})
engine.setViewport({offsetX: 0, offsetY: 0, scale: 1})
await engine.renderFrame()
```

That is enough to draw a rectangle and an ellipse.

## Add Click Hit-Testing

```ts
canvas.addEventListener('pointerdown', (event) => {
  const rect = canvas.getBoundingClientRect()
  const hit = engine.hitTest({
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }, 4)

  console.log(hit?.nodeId ?? 'empty')
})
```

If your viewport is panned or zoomed, convert pointer coordinates through your
runtime camera state before calling `hitTest`. Engine hit-tests receive scene
coordinates.

## Draw More Object Kinds

```ts
engine.loadScene({
  revision: 2,
  width: 640,
  height: 480,
  nodes: [
    {
      id: 'line-1',
      type: 'shape',
      shape: 'line',
      x: 40,
      y: 180,
      width: 220,
      height: 0,
      points: [{x: 40, y: 180}, {x: 260, y: 180}],
      stroke: '#111827',
      strokeWidth: 4,
      strokeEndArrowhead: 'triangle',
    },
    {
      id: 'path-1',
      type: 'shape',
      shape: 'path',
      x: 320,
      y: 160,
      width: 180,
      height: 120,
      bezierPoints: [
        {anchor: {x: 320, y: 260}},
        {anchor: {x: 500, y: 170}, cp1: {x: 380, y: 120}},
      ],
      stroke: '#7c3aed',
      strokeWidth: 3,
    },
    {
      id: 'text-1',
      type: 'text',
      x: 40,
      y: 240,
      text: 'Hello engine',
      style: {
        fontFamily: 'sans-serif',
        fontSize: 24,
        fill: '#111827',
      },
    },
  ],
})

await engine.renderFrame()
```

## Add Images

```ts
const engine = createEngine({
  canvas,
  resource: {
    loader: {
      resolveImage: (assetId) => imageMap.get(assetId) ?? null,
    },
  },
})
```

Then include an image node:

```ts
{
  id: 'image-1',
  type: 'image',
  x: 360,
  y: 240,
  width: 160,
  height: 100,
  assetId: 'photo-1',
}
```

## Next Steps

- Run `pnpm -C packages/engine demo` and open `http://127.0.0.1:5173/demo/`
  for a local HTML rendering test.
- Read `docs/en/api-reference.md` for the public API surface.
- Read `docs/en/scene-object-model.md` for the scene object contract.
- Read `docs/en/scene-capability-matrix.md` for render, hit-test, and extension
  field coverage.
