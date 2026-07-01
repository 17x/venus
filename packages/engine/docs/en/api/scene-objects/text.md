# `EngineTextNode` API

## Purpose

`EngineTextNode` represents render-facing text payload, rich runs, style,
measurement hints, and hit bounds.

## Type Shape

```ts
interface EngineTextNode extends EngineNodeBase {
  type: 'text'
  x: number
  y: number
  width?: number
  height?: number
  style: EngineTextStyle
  text?: string
  runs?: readonly EngineTextRun[]
  wrap?: 'none' | 'word' | 'char'
  cacheKey?: string
  lineCount?: number
  maxLineHeight?: number
}
```

## Required Properties

| Property | Type | Description |
| --- | --- | --- |
| `id` | `EngineNodeId` | Stable render node id. |
| `type` | `'text'` | Renderable node family discriminator. |
| `x` | `number` | Local text origin x. |
| `y` | `number` | Local text origin y. |
| `style.fontFamily` | `string` | Font family. |
| `style.fontSize` | `number` | Font size in world units. |

## Optional Supported Properties

| Property | Type | Description |
| --- | --- | --- |
| `width` | `number` | Text layout/hit width. |
| `height` | `number` | Text layout/hit height. |
| `text` | `string` | Plain-text fast path. |
| `runs` | `readonly EngineTextRun[]` | Rich-text run list. Preferred over `text` when present. |
| `wrap` | `'none' | 'word' | 'char'` | Wrapping policy hint. |
| `cacheKey` | `string` | Caller-supplied text layout/cache key. |
| `lineCount` | `number` | Measurement hint for line count. |
| `maxLineHeight` | `number` | Measurement hint for maximum line height. |
| `style.fontWeight` | `number | string` | Font weight. |
| `style.fontStyle` | `'normal' | 'italic' | 'oblique'` | Font style. |
| `style.lineHeight` | `number` | Line-height hint. |
| `style.letterSpacing` | `number` | Letter-spacing hint. |
| `style.fill` | `string` | Fill style. |
| `style.stroke` | `string` | Stroke style. |
| `style.strokeWidth` | `number` | Stroke width in world units. |
| `style.align` | `'start' | 'center' | 'end'` | Horizontal alignment. |
| `style.verticalAlign` | `'top' | 'middle' | 'bottom'` | Vertical alignment. |
| `style.shadow` | `EngineShadow` | Text-specific shadow hint. |
| `runs[].text` | `string` | Run text. |
| `runs[].style` | `Partial<EngineTextStyle>` | Run-level style overrides. |
| `opacity` | `number` | Node opacity multiplier. |
| `blendMode` | `string` | Backend blend-mode hint. |
| `transform` | `EngineTransform2D` | Local-to-parent transform. |
| `shadow` | `EngineShadow` | Node-level shadow hint. |
| `clip` | `EngineNodeClip` | Optional node clip. |

## Render Behavior

Use `runs` for rich text when present. Use `text` as the plain-string path.
Text shaping may be delegated through engine resource/text shaper options.

## Indexing Behavior

The node is indexed by explicit text bounds when supplied, otherwise by estimated
text bounds derived from content and style.

## Hit-Test Behavior

Hit-tested through explicit or estimated text bounds.

## Patch Behavior

Changing bounds, wrap, text, runs, style, or measurement hints invalidates text
layout and render caches.

## Cache Behavior

Cache keys should include `cacheKey` when supplied. Otherwise include text,
runs, style, wrap, measurement hints, clip, and transform-affecting context.

## Demo

```ts
const textNode = {
  id: 'text-1',
  type: 'text',
  x: 48,
  y: 80,
  width: 280,
  height: 56,
  text: 'Engine text node',
  runs: [
    {text: 'Engine', style: {fontWeight: 700}},
    {text: ' text node', style: {fill: '#475569'}},
  ],
  style: {
    fontFamily: 'system-ui',
    fontSize: 28,
    fill: '#111827',
  },
} satisfies EngineTextNode

engine.loadScene({revision: 8, width: 640, height: 480, nodes: [textNode]})
await engine.renderFrame()
```

## Non-Goals

- IME behavior.
- Text editing commands.
- Product rich-text toolbar state.
