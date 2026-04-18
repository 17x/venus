# Draft 1 Structured Data Pack

Source:

- Parsed from `docs/task/drafts/draft.txt` (raw property-panel HTML snapshot)

Purpose:

- Provide a stable data baseline for upcoming vector and engine refactors.
- Separate UI extraction from runtime implementation.

Files:

- `document-model.json`: scene/document domain model extracted from visible panel fields.
- `command-model.json`: command/action catalog inferred from controls and interactions.
- `icon-svg-catalog.json`: deduplicated SVG icon set for panel/tool actions.
- `property-panel-layout.json`: component layout tree for the right-side properties panel.

Notes:

- This is a first-pass normalized model from one snapshot (vector path selected).
- Data includes both direct-edit fields and style-list panels (fill/stroke/effects/export).
- Commands are named with stable, implementation-agnostic ids to support runtime mapping later.
