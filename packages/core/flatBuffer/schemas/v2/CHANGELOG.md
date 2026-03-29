# v2

- Added `Scene.document_id:string = ""`.
- This is a semantic schema evolution, so root `version` should move from `1` to `2` in runtime state before serialization.
- No field removals, no type changes, no reordering.
