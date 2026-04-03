# v5

- Extended the unified node + feature-composition model for multi-editor products.
- Added scene-level product metadata:
  - `Scene.product`
  - `Scene.editor_key`
  - `Scene.metadata:[KeyValue]`
- Added node identity and patch-friendly metadata:
  - `Node.name`
  - `Node.parent_node_id`
  - `Node.feature_entries:[FeatureEntry]`
  - `Node.node_kind`
  - `Node.is_visible`
  - `Node.is_locked`
- Added stable feature wrapper:
  - `FeatureEntry.feature_id`
  - `FeatureEntry.role`
- Added cross-editor features:
  - `MetadataFeature`
  - `MindmapBranchFeature`
  - `ConnectorFeature`
- Added enums for product/editor-specific structure:
  - `ProductType`
  - `BranchSide`
  - `ConnectorType`

Compatibility notes:

- Existing v4 fields are preserved in order.
- Runtime migration should synthesize `feature_entries` from legacy `features`.
- v4 scenes default to `product = Vector` during migration.
