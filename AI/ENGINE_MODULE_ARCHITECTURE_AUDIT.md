# Engine Module Architecture Audit

**Date:** 2026-07-02
**Status:** Archived historical snapshot — superseded by ENGINE_MODULE_CONSTRAINTS.md

> Do not implement new work from this file. It records the pre-refactor audit only.
> Current module names, service names, API gating, and execution checklist live in
> `ENGINE_MODULE_CONSTRAINTS.md`.

---

## Current State (pre-refactor)

### Module Inventory: 11 names, 6 implemented, 5 stubs

| #   | Module    | Status        | Category    |
| --- | --------- | ------------- | ----------- |
| 1   | `render`  | core-module   | runtime     |
| 2   | `camera`  | core-module   | runtime     |
| 3   | `hitTest` | core-module   | interaction |
| 4   | `select`  | reserved stub | interaction |
| 5   | `snap`    | reserved stub | editing     |
| 6   | `animate` | core-module   | runtime     |
| 7   | `debug`   | core-module   | runtime     |
| 8   | `scale`   | reserved stub | editing     |
| 9   | `effects` | reserved stub | editing     |
| 10  | `history` | core-module   | editing     |
| 11  | `export`  | reserved stub | output      |

### Internal Services: 11 names, 3 registered

| Service         | Registered |
| --------------- | ---------- |
| `document`      | ✅         |
| `viewport`      | ✅         |
| `invalidation`  | ✅         |
| `sceneStore`    | ❌         |
| `geometry`      | ❌         |
| `spatial`       | ❌         |
| `geometryCache` | ❌         |
| `renderPlan`    | ❌         |
| `scheduler`     | ❌         |
| `resource`      | ❌         |
| `backendBridge` | ❌         |

### Key Problems Found

1. **All methods hardcoded on Venus class** — module installation does not gate API availability. No tree-shaking possible.
2. **No API injection pattern** — modules can't add methods to Venus; they're bare function imports.
3. **Camera ↔ Animate are unrelated** — correct design, no coupling needed.
4. **Screen culling is minimal** — only超大节点裁剪，无 viewport culling via spatial index.
5. **Geometry cache is single-tier** — no AABB/BBOX/PATH分层。
6. **Spatial index (RBush) exists but not registered as service.**
7. **No module combination tests.**
8. **`select` + `snap` should merge to `interaction`; `scale` should merge into `render`.**

### Renderer Assessment

- Canvas2D: primary, complete. Best for docs/editor.
- WebGL: partial. Best for 1000+ node scenes, frequent transforms, texture compositing.

### Test Coverage: 41 test files

- ✅ Model property creation
- ✅ Shape rendering (canvas2d)
- ✅ Venus CRUD API
- ✅ Hit testing
- ❌ Module combination tests (missing)
- ❌ Module boundary tests (missing)
- ❌ New property tests (strokeConfig, fillConfig, ellipseGeometry, anchorPoints)

---

## Proposed Architecture (see CONSTRAINTS for final version)

### Layer Model

```
Layer 0: Core Infrastructure (internal services, not user-facing)
  spatial, geometryCache, scheduler

Layer 1: Base Capabilities (always-present, no opt-out)
  render, viewport

Layer 2: Interaction (user-installable)
  camera, hitTest, interaction(select+snap), animate

Layer 3: Editing Enhancements (user-installable)
  history, effects, export

Layer 4: Debug (user-installable)
  debug
```

### Dependency Direction

```
render ← viewport
render + spatial ← hitTest
hitTest + camera ← interaction
(no deps) ← animate
(no deps) ← history
render ← effects ← export
```

### Geometry Cache Tiers

```
aabb       — axis-aligned bounding box (fastest, for culling)
bbox       — oriented bounding box (for rotated hit testing)
path       — precise path (for exact collision)
simplified — LOD-degraded path (for zoomed-out rendering)
```
