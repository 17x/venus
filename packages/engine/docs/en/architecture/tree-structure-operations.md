# Tree Structure Operations

This document defines how `@venus/engine` owns document-tree structure
operations. Vector and other host apps may trigger these operations, but they
must not reimplement different tree semantics in product code.

The target product shape is Figma-like: users can select nested nodes, group
them, ungroup them, reorder layers, move nodes across containers, and work
inside clip or mask containers. The engine must turn those product gestures into
deterministic tree transactions.

## Source Of Truth

The engine document model is a strict ordered tree.

```txt
root
  frame | group | clip | mask | leaf
    frame | group | clip | mask | leaf
      leaf
```

The authoritative structure is:

| Store | Responsibility |
| --- | --- |
| `nodeById` | Stable id lookup for every public document node. |
| `parentById` | Parent id for every nested node; root children map to `null`. |
| Parent child list | Ordered sibling ids for one parent. |

Layer order is always parent-local. There is no global layer index. Any layer
operation must answer: "which parent child list is being reordered?"

## Operation Pipeline

Every structural command should run through the same pipeline:

1. Normalize the selection.
2. Resolve the operation scope and parent policy.
3. Create a tree transaction.
4. Apply node/parent/order changes atomically.
5. Record history from before/after tree state.
6. Emit structure events.
7. Mark render, hit-test, export, and cache invalidation.

No operation should directly mutate scattered arrays without producing the same
transaction metadata.

## Selection Normalization

Before `group`, `ungroup`, layer manipulation, or reparent commands run, the
selection must be normalized.

Rules:

- If both a node and one of its descendants are selected, keep only the ancestor.
- Sort selected ids by current render/tree order.
- Resolve each selected node's `parentId`, sibling `index`, bounds, local
  transform, and world transform.
- Reject missing ids before mutation.
- Keep the normalized ids as the only ids passed into the tree operation.

This prevents double-moving a child when its parent is already selected.

## Group

### Same-Parent Grouping

When all selected nodes have the same parent:

1. Create a structure-only `group`.
2. Insert the group at the minimum selected sibling index.
3. Move selected nodes into the group in their normalized order.
4. Preserve child authored geometry and world position.
5. Remove selected nodes from the original parent child list.
6. Select the new group after the operation.

The group itself must not own authored `x`, `y`, `width`, or `height`.

### Cross-Parent Grouping

Cross-parent grouping is an engine-owned tree transaction, not a Vector-side
shortcut.

Target behavior:

1. Resolve the lowest common ancestor of the normalized selected nodes.
2. Create the new group under that ancestor.
3. Insert it at the earliest projected selected position in the ancestor's child
   order.
4. Remove selected nodes from their original parents.
5. Recompute each moved node's local transform so its world transform stays the
   same.
6. Mark every old parent, the new group, and the lowest common ancestor dirty.

P0 behavior may reject cross-parent grouping until the explicit tree
transaction API is implemented. Host apps must not implement their own
cross-parent grouping policy to bypass that rejection.

## Ungroup

Ungroup is parent-local:

1. Find the group in its parent child list.
2. Remove the group.
3. Insert the group's children at the removed group's index.
4. Preserve child order and child world position.
5. Delete the group node and its id mapping.
6. Select the lifted children after the operation.

Ungroup discards the group node's own properties. The engine must not transfer
group `name`, `data`, `opacity`, `blendMode`, `appearance`, shadows, blur,
constraints, or export settings onto the lifted children. This is intentional:
ungroup removes the composition wrapper rather than baking wrapper appearance
into descendants.

## Layer Manipulation

Layer APIs are parent-local by default:

- `getLayerIndex(id)`
- `getLayerOrder(parentId?)`
- `moveLayer(id, index)`
- `moveBefore(id, targetId)`
- `moveAfter(id, targetId)`
- `bringForward(id)`
- `sendBackward(id)`
- `bringToFront(id)`
- `sendToBack(id)`

Rules:

- A layer operation can only reorder siblings inside one parent.
- `moveBefore` and `moveAfter` reject targets from a different parent.
- Multi-selection layer operations group selected ids by parent and apply one
  parent-local transaction per parent unless the command is explicitly a
  reparent command.
- Moving a node from one parent to another is not a layer operation. It is a
  reparent transaction.

## Reparent

Reparenting changes document structure and may change clip, mask, and frame
semantics.

Target reparent behavior:

1. Remove the node from its old parent child list.
2. Insert the node into the new parent child list at the requested index.
3. Preserve authored geometry in the current Venus document model. When a
   future document mode stores explicit parent-local transform data, recompute
   that local transform so the node's world transform remains stable.
4. Mark old parent, new parent, moved subtree, and their ancestor chain dirty.
5. Emit one structure event with affected node ids and parent-local order.
6. Record before/after tree state for history.

Reparenting into or out of clip/mask containers must be explicit because it
changes render, hit-test, and export output.

## Clip And Mask

Clip and mask are tree containers, not simple effects.

Public document shape:

```txt
clip | mask
  clipPath
  children[]
```

Rules:

- `clipPath` is not a normal layer child and does not participate in ordinary
  child order.
- Children inside clip/mask participate in that container's parent-local layer
  order.
- Moving a node into clip/mask is a reparent transaction and changes
  render/hit/export semantics.
- Moving a node out of clip/mask is also a reparent transaction.
- Group and layer operations must not silently cross clip/mask boundaries.
- `respectClip: true` hit-testing must not return clipped-out children.

## History Contract

History must store before/after tree state, not only the command name.

Required structure history data:

```ts
type StructureHistoryEntry = {
  type: 'structure'
  before: {
    parentChildren: Record<string, readonly string[]>
    nodes: readonly unknown[]
    selection: readonly string[]
  }
  after: {
    parentChildren: Record<string, readonly string[]>
    nodes: readonly unknown[]
    selection: readonly string[]
  }
  affectedNodeIds: readonly string[]
  affectedParentIds: readonly (string | null)[]
  revision: number
}
```

Undo and redo apply stored tree state. They must not rerun the original group,
ungroup, layer, or reparent algorithm, because command algorithms can evolve
over time.

## Render And Invalidation

Each tree transaction must produce structure invalidation.

Required invalidation metadata:

```ts
type StructureInvalidation = {
  kind: 'structure'
  affectedNodeIds: readonly string[]
  affectedParentIds: readonly (string | null)[]
  boundsBefore: unknown
  boundsAfter: unknown
  orderChanged: boolean
  clipAffected: boolean
}
```

Rules:

- Parent child order change marks the parent structure dirty.
- Cross-parent movement marks old parent, new parent, moved subtree, and common
  ancestors dirty.
- Clip/mask boundary movement marks render, hit-test, export, and clip graph
  caches dirty.
- Preserving world position through local-transform recomputation is still a
  structure mutation, not only a transform mutation.

## Events

Successful structure transactions emit:

- `document:structure-changed`
- `document:changed`
- `layer:changed` only for parent-local layer order changes
- `selection:changed` when the selection changes as a result of the command

No event should fire for rejected or no-op structure commands.

## Current P0 Status

Implemented:

- Parent-local grouping and ungrouping.
- Parent-local layer APIs.
- Nested parent indexing for group, frame, clip, and mask containers.
- Parent-local nested subtree removal through `venus.remove(id)`.
- Single-node cross-container moves through `venus.reparent(id, parentId, index?)`.
- Structure events for group, ungroup, child add/remove, layer moves, nested
  remove, and reparent.
- Ungroup discards group wrapper properties.
- Grouping normalizes product selections by dropping selected descendants when
  a selected ancestor is also present.

Pending engine-owned work:

- Cross-parent grouping through explicit tree transactions.
- Reparent transform baking for future document modes that store parent-local
  transforms differently from the current authored Venus geometry model.
- Multi-parent selection layer commands.
- History entries that store compact before/after tree transaction data instead
  of broad snapshots.
- Clip/mask boundary transaction invalidation and tests across render, hit, and
  export.

Vector must validate these capabilities by using engine APIs. Vector should not
become the owner of alternate group, ungroup, layer, clip, or mask tree rules.
