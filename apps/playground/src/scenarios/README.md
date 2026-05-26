# Playground Scenarios

This folder models engine capability validation scenarios.

- `2d-basic`: baseline shape/text rendering coverage
- `2d-interactive`: hover/selection overlay regression stress scene
- `2d-performance`: high node-count culling and frame-time pressure scene
- `webgl-render`: WebGL packet/tile-cache oriented scene
- `canvas2d-fallback`: Canvas2D compatibility fallback scene
- `headless-deterministic`: deterministic browser/headless parity scene
- `3d-spatial`: pseudo-3D layered spatial ordering and culling scene
- `3d-editor-validation`: typical 3D editor viewport and side-panel composition with semantic3d depth/material coverage

Use query parameter `?scenario=<id>` to deep-link any scenario.

Hash route `#/3dEditor` mounts local typical-3D-editor validation mode and preselects `3d-editor-validation`.
