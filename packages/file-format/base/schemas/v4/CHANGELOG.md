# v4

- Promoted production-grade unified node + feature-composition model for Figma-like editing.
- Feature union now includes:
  - `FillFeature`
  - `StrokeFeature`
  - `LayoutFeature`
  - `ConstraintFeature`
  - `TextFeature`
  - `VectorFeature`
  - `ImageFeature`
  - `EffectFeature`
- Added rich text:
  - `TextFeature.text`
  - `TextFeature.runs:[TextRun]`
- Added path-command vector model:
  - `VectorFeature.paths:[VectorPath]`
  - `VectorPath.commands:[PathCommand]`
- Added image reference policy fields:
  - `ImageFeature.image_id`
  - `ImageFeature.scale_mode`
- Added layout/constraint enums and fields for simplified flex-like auto layout.
- Added node compatibility fields:
  - `Node.node_id:string`
  - `Node.child_nodes:[Node]`
- Added scene convenience root:
  - `Scene.root_nodes:[Node]`

Compatibility notes:

- Existing schema fields preserved in order.
- Runtime migration should move from v3 nodes to v4 nodes with string IDs and feature defaults.
