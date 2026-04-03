# v3

- Added unified `Node` table and feature-based composition system.
- Added `NodeType` for coarse classification only.
- Added `Feature` union with:
  - `FillFeature`
  - `StrokeFeature`
  - `TextFeature`
  - `VectorFeature`
  - `ImageFeature`
  - `LayoutFeature`
- Added root fields:
  - `Scene.nodes:[Node]`
  - `Scene.root_node_ids:[uint32]`

Notes:

- Existing v2 fields remain unchanged and ordered.
- Migration should move runtime data from legacy `root_elements` model to `nodes + features`.
