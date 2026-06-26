# `EngineGroupNode` API

## Purpose

`EngineGroupNode` represents render-facing hierarchy, child order, inherited
visual properties, and group transforms.

## Type Shape

```ts
interface EngineGroupNode extends EngineNodeBase {
  type: 'group'
  children: readonly EngineRenderableNode[]
}
```

## Required Properties

| Property | Type | Description |
| --- | --- | --- |
| `id` | `EngineNodeId` | Stable render node id. |
| `type` | `'group'` | Renderable node family discriminator. |
| `children` | `readonly EngineRenderableNode[]` | Ordered child nodes. Later children are visually higher. |

## Optional Supported Properties

| Property | Type | Description |
| --- | --- | --- |
| `opacity` | `number` | Group opacity multiplier. |
| `blendMode` | `string` | Backend blend-mode hint. |
| `transform` | `EngineTransform2D` | Transform composed into child world transforms. |
| `shadow` | `EngineShadow` | Optional shadow hint inherited by group rendering paths that support it. |
| `clip` | `EngineNodeClip` | Optional clip applied to the group subtree. |

## Render Behavior

Children render through group traversal. Group transform and visual properties are
composed into child rendering context when the backend supports composition.

## Indexing Behavior

Groups are indexed by child-union bounds. Nested children are also individually
indexed.

## Hit-Test Behavior

Children participate in hit-testing through group traversal and transforms.
Direct empty-area group hits are not currently part of the engine contract.

## Patch Behavior

Nested child changes should be submitted as an updated group subtree unless a
future nested patch API is documented and implemented.

## Cache Behavior

Changing `children` invalidates structure and geometry. Changing `transform`,
`opacity`, `blendMode`, `shadow`, or `clip` invalidates render plans and
transform/style-dependent caches.

## Demo

```ts
const groupNode = {
  id: 'group-1',
  type: 'group',
  transform: {matrix: [1, 0, 80, 0, 1, 40]},
  children: [
    {
      id: 'group-rect',
      type: 'shape',
      shape: 'rect',
      x: 0,
      y: 0,
      width: 120,
      height: 80,
      fill: '#dcfce7',
    },
  ],
} satisfies EngineGroupNode

engine.loadScene({
  revision: 2,
  width: 640,
  height: 480,
  nodes: [groupNode],
})

await engine.renderFrame()
```

## Non-Goals

- Group/ungroup product commands.
- Isolation mode.
- Deep-select policy.
- Layer-panel state.
