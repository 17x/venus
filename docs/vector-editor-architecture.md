# Venus Vector Editor — Architecture & Implementation Plan

This document captures the full architecture, module map, data flows, gap
analysis, and migration plan for the `vector / runtime / engine` stack. It is
the primary reference for developers and agents continuing this work.

---

## 1. Layer Overview

```
┌──────────────────────────────────────────────────────────────┐
│  vector (apps/vector-editor-web)                             │
│  Product rules, UI shell, tool orchestration, command        │
│  composition, product state, panels, menus, shortcuts        │
├──────────────────────────────────────────────────────────────┤
│  runtime (@venus/runtime + subpaths)                         │
│  Lifecycle, worker bridge, viewport, command system,         │
│  interaction algorithms, snapping, hittest adapter,          │
│  overlay data, scene bridge, presets                         │
├──────────────────────────────────────────────────────────────┤
│  engine (@venus/engine)                                      │
│  Canvas2D/WebGL renderer, scene store, spatial index,        │
│  hittest mechanism, geometry, viewport math, scheduling      │
├──────────────────────────────────────────────────────────────┤
│  document-core (@venus/document-core)                        │
│  Persisted document model, runtime scene types, geometry     │
│  primitives, affine math, id generation                      │
└──────────────────────────────────────────────────────────────┘
```

Dependency direction: `vector -> runtime -> engine`, with `document-core` as a
shared type/primitive foundation consumed by all layers.

---

## 2. Layer Responsibilities — Current vs Target

### 2.1 vector (apps/vector-editor-web)

#### Currently implemented

- Editor shell layout (toolbar, header, panels, canvas, status bar)
- 11 tool buttons with shortcut binding
- Property panel (geometry, fill/stroke/shadow, corners, ellipse angles)
- Layer panel with virtualized tree, multi-select, reorder
- Context menu (copy/paste/duplicate/delete/mask/undo/redo/layer reorder)
- Keyboard shortcuts (50+ bindings across file/edit/view/text/layer/tools)
- Transform preview (move/scale/rotate) with live overlay
- Marquee box selection with selection-apply controller
- Snap guides overlay
- Selection chrome (handles, hover outline)
- Template picker with seeded generators (3 categories, 8→13 presets)
- Clipboard (copy/cut/paste/duplicate)
- File create/open/save via file-context adapters
- Language switcher (i18n)

#### Gaps to fill

| Gap                                | Priority | Description                                                                                                                                                                                                               |
| ---------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tool registry**                  | High     | Tools are string names with no handler lifecycle. New `src/tools/registry.ts` provides the extensible pattern.                                                                                                            |
| **Editing mode controller**        | High     | No explicit editing mode state machine. New `src/state/editingMode.ts` provides `idle/selecting/dragging/resizing/rotating/drawing/text-editing/path-editing/group-isolation`.                                            |
| **Product object semantics**       | Medium   | No compound path, boolean result, mask/clip group, guide, artboard, symbol types at the product level. Document-core has the shape primitives; vector needs to define product-level object behavior contracts above them. |
| **Inspector schema registry**      | Medium   | Property panel is hardcoded per shape type. Needs a schema-driven registry so new object types can register their inspector panels.                                                                                       |
| **Action type safety**             | Medium   | `EditorExecutor` uses loose `(type, data?)` signature. Should evolve to a discriminated union for exhaustive handling.                                                                                                    |
| **useEditorRuntime decomposition** | Medium   | Single 1400+ line hook. Should split into focused sub-hooks: `useToolState`, `useTransformSession`, `useMarqueeSession`, `useSelectionActions`, `useDocumentActions`.                                                     |
| **Import/export module**           | Medium   | Currently ad-hoc in file-context. Needs structured import/export flow with format extensibility.                                                                                                                          |
| **Testing fixtures module**        | Medium   | Template presets now carry test metadata. Need test runner integration and regression scenario definitions.                                                                                                               |
| **Boolean operations**             | Low      | Planned but not started. Requires runtime command + engine geometry support.                                                                                                                                              |
| **Path node editing**              | Low      | Freehand drawing exists; bezier control point editing UI is missing.                                                                                                                                                      |
| **Collaboration UI**               | Low      | Protocol foundation exists in runtime/worker; no product UI yet.                                                                                                                                                          |

### 2.2 runtime (@venus/runtime)

#### Currently implemented

- `createCanvasRuntimeController` — lifecycle, worker bridge, viewport state
- `createCanvasRuntimeKit` — engine bridge, render requests, gesture API
- `createCanvasRuntimeApi` — presentation config, overlay layer registration
- Worker protocol (typed `EditorRuntimeCommand` union)
- Worker scope binding (`bindEditorWorkerScope`) — command execution, selection, hittest
- History (undo/redo stack in worker, `HistorySummary` published to main thread)
- Viewport controller (pan/zoom/fit/resize with matrix math)
- Interaction algorithms:
  - Marquee selection (`createMarqueeState`)
  - Snapping (`resolveMoveSnapPreview`)
  - Selection handles (8-point + center + rotate)
  - Transform preview + session manager
  - Selection pointer policy, drag controller
  - Shape hit-test (point-in-shape)
- Presets: selection, snapping, history, protocol modules
- Scene adapter (`engineSceneAdapter.ts` in presets)
- Gesture interpreter (pointer/wheel → pan/zoom)
- SharedArrayBuffer layout + sync helpers
- Transform preview commit controller

#### Gaps to fill

| Gap                                    | Priority | Description                                                                                                                                                                                    |
| -------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Command registry**                   | High     | Commands are implicit protocol messages. New `src/commands/registry.ts` provides a formal registry with descriptors, handlers, and undo contracts.                                             |
| **Hit-test adapter**                   | High     | Engine returns single hit result; no product-level enrichment. New `src/interaction/hitTestAdapter.ts` provides multi-candidate, lock/hidden/isolation filtering, product kind classification. |
| **Multi-hit engine API**               | High     | Engine `hitTestEngineSceneState` returns `                                                                                                                                                     | null`. Should return `EngineHitTestResult[]` for overlap disambiguation. |
| **Document model runtime abstraction** | Medium   | Runtime passes `EditorDocument` from document-core directly. May need a runtime-specific read/write facade for mutation helpers, traversal, and validation hooks.                              |
| **Explicit scene-bridge module**       | Medium   | Scene bridge is scattered across `presets/engineSceneAdapter.ts`. Should be a first-class core module for object-to-render mapping, diff patching, id mapping.                                 |
| **Overlay data model**                 | Medium   | Overlays are managed by product layer directly. Runtime should own overlay data contracts (selection box, handles, guides, drag preview) as structured data, not just visual components.       |
| **Diagnostics module**                 | Low      | Scattered diagnostic data. Should centralize hittest timing, render invalidation count, snap candidate count, selection query timing.                                                          |
| **Scheduler module**                   | Low      | Render scheduling is ad-hoc. Could centralize deferred sync, throttled update, idle precompute.                                                                                                |

### 2.3 engine (@venus/engine)

#### Currently implemented

- Canvas2D renderer (text runs, image clips, shadows, frame reuse, culling)
- WebGL renderer (geometry rendering, hybrid canvas fallback for text)
- Scene store (`createEngineSceneStore`) — load, patch, batch patch, transaction, query, hitTest
- Scene patch system (apply/batch/flatten)
- Spatial index (RBush-based 2D index)
- Hit-test mechanism (point-in-shape with tolerance, clip support)
- Marquee selection queries (containment/intersection modes)
- Snapping (move snap solving + guide lines)
- Selection handles (position calc + pick)
- LOD profiling (initial)
- Viewport math (pan/zoom/fit, world↔screen transforms, scale clamping 0.02x–32x)
- Viewport pan (pointer/wheel accumulation)
- Zoom sessions (wheel/gesture normalization, settle delay)
- Shape transform (affine matrix, resolved node transform, batch transform)
- Animation controller (frame clock, easing)
- Render plan/instance batching
- Replay tiles (progressive bitmap replay for large scenes)
- Replay coordinator (worker-based replay request/cancel)
- WebGL packet compilation + resource budget tracking
- Worker capability detection + mode resolution

#### Gaps to fill

| Gap                                 | Priority | Description                                                                                                                                                   |
| ----------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Multi-hit API**                   | High     | `hitTestEngineSceneState` returns single result. Needs to return ranked array for overlap disambiguation, context menus, click-through.                       |
| **Viewport culling depth**          | Medium   | Basic bounds culling exists in renderer. Should expand for spatial-index-driven culling in hittest and snapping candidate collection.                         |
| **LOD implementation**              | Medium   | Profiling exists (`lodProfile.ts`). Active LOD (text simplification, path decimation, image downsampling) not yet wired.                                      |
| **Text subsystem**                  | Medium   | Text rendering is inline in canvas2d.ts. Should evolve toward glyph cache, atlas management, and zoom-level cache reuse.                                      |
| **Image subsystem**                 | Medium   | Image rendering is inline. Should evolve toward resolution grading, thumbnail levels, lazy decode.                                                            |
| **Resource cache / eviction**       | Medium   | WebGL resource budget tracker exists. Canvas2D lacks explicit resource cache lifecycle.                                                                       |
| **Static/dynamic layer separation** | Low      | Overlay independent rendering exists in app adapters. Engine should formally support static vs dynamic render layers for better interaction-time performance. |

---

## 3. Data Flows

### 3.1 Document → Render Chain

```
VisionFile (app format)
  → fileDocument.ts adapter
    → EditorDocument (@venus/document-core)
      → Worker init message (protocol.ts)
        → Worker loads document into mutable scene state
          → Scene patch → Engine scene store
            → Renderer draws from EngineSceneSnapshot + viewport
```

### 3.2 Interaction → Command Chain

```
DOM pointer/keyboard event
  → Canvas viewport resolveWorldPoint()
    → useEditorRuntime pointer dispatch
      → Runtime gesture interpreter (pan/zoom)
      → or Tool handler dispatch (future: tool registry)
        → Transform session manager / marquee controller / selection drag
          → Product-level rule evaluation (tool state + editing mode + selection)
            → EditorRuntimeCommand dispatch
              → Worker: command execution → document mutation
                → Scene update message → runtime snapshot refresh
                  → Renderer redraw
```

### 3.3 Hittest Chain (Current → Target)

#### Current

```
Pointer event → Worker pointerSelection.ts
  → Engine hitTestEngineSceneState() → single result | null
    → Worker selects/hovers based on result
      → Scene update flags → main thread overlay refresh
```

#### Target

```
Pointer event → Runtime hit-test adapter
  → Engine multi-hit query → EngineHitTestResult[]
    → Adapter enrichment (lock/hidden/group/isolation filtering)
      → RuntimeHitTestResult (ranked candidates)
        → Product layer: tool-specific + editing-mode-specific rule decision
          → Selection command dispatch
```

### 3.4 Snapping Chain

```
Transform session (move/resize/rotate delta)
  → Runtime snapping module
    → Collect snap candidates from engine spatial index
      → Geometric query: point-to-point, edge-to-edge, center, grid
        → Score + threshold + hysteresis evaluation
          → SnapPreview: adjusted position + guide lines data
            → Product layer: overlay renders snap guides
```

### 3.5 History Chain

```
Command execution in worker
  → History entry recording (localHistoryEntry.ts)
    → Transaction boundary → history stack push
      → HistorySummary published to main thread
        → Product layer: history panel UI + dirty state
          → Undo/redo: reverse command → scene update → render
```

---

## 4. Command System Design

### 4.1 Architecture

```
                    ┌─ CommandRegistry (runtime) ─┐
                    │  register(handler)           │
                    │  get(type) → handler         │
                    │  list() → descriptors        │
                    └──────────────────────────────┘
                               ▲
              ┌────────────────┼────────────────┐
              │                │                │
     Product Commands    Runtime Commands   Future Plugins
     (vector layer)      (built-in)         (extensions)
```

### 4.2 Command Lifecycle

1. **Dispatch**: Product layer calls `dispatchCommand({ type, ...params })`
2. **Validate**: Registry looks up handler, runs `descriptor.validate(params)`
3. **Execute**: Handler receives `CommandExecutionContext` (view + mutator)
4. **Record**: If `undoable`, execution returns undo payload → pushed to history stack
5. **Publish**: Scene update message sent to main thread → render refresh
6. **Undo**: History pop → handler's `undo(ctx, payload)` called → scene update

### 4.3 Command Categories

| Category          | Examples                                                      | Layer                 |
| ----------------- | ------------------------------------------------------------- | --------------------- |
| Document mutation | shape.insert, shape.remove, shape.patch                       | Runtime (handler)     |
| Selection         | selection.set, selection.clear                                | Runtime (handler)     |
| Transform         | shape.move, shape.resize, shape.rotate, shape.transform.batch | Runtime (handler)     |
| Grouping          | group.create, group.dissolve                                  | Runtime (handler)     |
| Ordering          | shape.reorder, shape.bringToFront, shape.sendToBack           | Runtime (handler)     |
| Clipboard         | clipboard.copy, clipboard.paste, clipboard.duplicate          | Product (macro)       |
| View              | viewport.fit, viewport.zoomIn                                 | Runtime (handler)     |
| Macro/workflow    | align-selection, distribute-selection, auto-mask              | Product (composition) |

---

## 5. Hit-Test Design

### 5.1 Layered Hit-Test

```
Engine layer (mechanism):
  → Point-in-geometry tests (fill, stroke, bounds, path)
  → Returns EngineHitTestResult[] (multi-hit, ordered by z-order)

Runtime layer (adapter):
  → Enriches with product state (locked, hidden, group membership)
  → Filters by context (isolation mode, exclude set)
  → Classifies by kind (shape/group/text/image/handle/overlay)
  → Ranks by eligibility + score
  → Returns RuntimeHitTestResult

Product layer (decision):
  → Applies tool-specific rules (selector vs direct-selector)
  → Applies editing-mode rules (isolation, text-editing)
  → Decides final selection action (replace/add/toggle/clear)
```

### 5.2 Multi-Hit Requirements

The engine `hitTestEngineSceneState` should evolve to return an array:

```typescript
interface EngineHitTestResult {
  index: number;
  nodeId: string;
  nodeType: string;
  hitType?: "fill" | "stroke" | "bounds"; // what was hit
  distance?: number; // proximity score
}

// Return all hits at point, ordered by z-order (top-first)
function hitTestEngineSceneStateAll(
  state: MutableEngineSceneState,
  point: EnginePoint,
  tolerance?: number,
): EngineHitTestResult[];
```

---

## 6. Snapping Design

### 6.1 Current State

Runtime `resolveMoveSnapPreview` handles move-snap with bounds intersection.
Engine `resolveEngineMoveSnapPreview` provides the geometric solving.

### 6.2 Target Snap Types

| Type                           | Status         | Description                                                     |
| ------------------------------ | -------------- | --------------------------------------------------------------- |
| Point-to-point (corner/center) | ✅ Implemented | Snap moving shape corners/center to other shape corners/centers |
| Edge-to-edge                   | ✅ Implemented | Horizontal/vertical boundary alignment                          |
| Grid snap                      | ❌ Missing     | Snap to configurable grid (requires product-level grid state)   |
| Guide/ruler snap               | ❌ Missing     | Snap to user-placed guide lines (requires guide data model)     |
| Resize snap                    | ❌ Missing     | Snap during resize to other object edges/centers                |
| Rotate snap                    | ❌ Missing     | Angular snapping (15° increments, aligned with other objects)   |

### 6.3 Snap Output Contract

```typescript
interface SnapResult {
  targetId?: string; // what we snapped to
  snapType: "point" | "edge" | "center" | "grid" | "guide";
  axis: "x" | "y" | "both";
  inputPosition: Point; // original position
  outputPosition: Point; // snapped position
  delta: Point; // snap adjustment
  score: number; // relevance (lower = stronger snap)
  guideLines: SnapGuideLine[]; // visual feedback data
}
```

---

## 7. Overlay Design

### 7.1 Overlay Categories

| Overlay                       | Owner                        | Update Frequency                    |
| ----------------------------- | ---------------------------- | ----------------------------------- |
| Selection box (bounding rect) | Runtime data, product render | On selection change                 |
| Resize/rotate handles         | Runtime data, product render | On selection change + viewport zoom |
| Hover outline                 | Runtime data, product render | On pointer move                     |
| Marquee rectangle             | Runtime data, product render | On pointer drag (high freq)         |
| Snap guide lines              | Runtime data, product render | On drag/resize (high freq)          |
| Transform preview             | Runtime data, product render | On drag/resize/rotate (high freq)   |
| Drag preview                  | Product                      | On drag (high freq)                 |
| Measurement hints             | Future                       | On hover/drag near edges            |

### 7.2 Overlay Data Flow

```
Runtime produces overlay data (structured, framework-agnostic):
  { selectionBounds, handles[], hoverOutline, marqueeRect, snapGuides[], transformPreview }

Product layer renders overlays:
  InteractionOverlay.tsx consumes overlay data and draws via Canvas2D or SVG
```

### 7.3 Design Principle

Overlay data contracts live in runtime. Overlay rendering lives in the product
layer. This separation allows runtime to update overlay data at interaction
frequency while product layer decides visual style, z-order, and degradation
strategy.

---

## 8. Viewport Control

### 8.1 Current Implementation

- `@venus/runtime/viewport/controller.ts` — pan/zoom/fit/resize
- `@venus/engine/interaction/viewport.ts` — state derivation, matrix, clamping
- `@venus/engine/interaction/viewportPan.ts` — pointer/wheel pan accumulation
- `@venus/engine/interaction/zoom.ts` — wheel/gesture zoom normalization

### 8.2 Control Chain

```
User gesture (wheel/pinch/keyboard)
  → Runtime gesture interpreter
    → Viewport controller: apply delta
      → Engine viewport math: clamp scale, compute matrix/inverse
        → New EngineCanvasViewportState
          → Renderer draws with new viewport
          → Overlays recalculate screen positions
```

### 8.3 Viewport Operations

| Operation              | Status | Implementation                                          |
| ---------------------- | ------ | ------------------------------------------------------- |
| Pan (wheel/drag)       | ✅     | Runtime viewport controller + engine pan accumulation   |
| Zoom (wheel/pinch)     | ✅     | Runtime gesture interpreter + engine zoom session       |
| Fit to document        | ✅     | `fitEngineViewportToDocument`                           |
| Zoom in/out (keyboard) | ✅     | Zoom presets (25%–3200%)                                |
| Focus to selection     | ❌     | Needs: compute selected bounds → fit viewport to bounds |
| Scroll to node         | ❌     | Needs: find node bounds → center viewport on node       |

---

## 9. Performance Strategy for 50K+ Elements

### 9.1 Current Optimizations

| Optimization                    | Status     | Location                                       |
| ------------------------------- | ---------- | ---------------------------------------------- |
| Viewport culling                | ✅ Basic   | Canvas2D renderer (bounds check during draw)   |
| RBush spatial index             | ✅         | `@venus/engine/spatial`                        |
| Frame reuse cache               | ✅         | Canvas2D renderer viewport bitmap caching      |
| Replay tiles (progressive)      | ✅         | Engine replay coordinator + worker             |
| Input-priority render scheduler | ✅         | App canvas adapters (coalesced, single-flight) |
| Static/dynamic separation       | ✅ Partial | Interactive vs full-quality redraw paths       |
| DPR switching                   | ✅         | Engine `setDpr()` for clarity/perf tradeoff    |

### 9.2 Planned Optimizations

| Optimization                             | Priority | Description                                                               |
| ---------------------------------------- | -------- | ------------------------------------------------------------------------- |
| **Spatial-index-driven culling**         | High     | Use RBush for hittest/snapping candidate pre-filter instead of full scan  |
| **LOD rendering**                        | High     | Text → rect fallback at low zoom; path simplification; image downsampling |
| **Batch patch optimization**             | High     | Reduce per-node overhead for large selection transforms                   |
| **Group-level caching**                  | Medium   | Cache rendered groups as bitmaps; invalidate on child mutation            |
| **Path geometry simplification**         | Medium   | Reduce control points at low zoom for faster stroke rendering             |
| **Texture atlas for text**               | Medium   | Shared glyph atlas across text nodes to reduce draw calls                 |
| **Incremental spatial index**            | Medium   | Partial insert/remove instead of full rebuild on scene change             |
| **Interaction-time quality degradation** | Medium   | Lower render quality during pan/zoom; full quality on settle              |
| **Async precompute**                     | Low      | Off-thread geometry prep for incoming viewport regions                    |
| **Tile-based scene management**          | Low      | Chunk large scenes into tiles for streaming load/render                   |

### 9.3 Performance Targets

| Metric              | Target         | Notes                                          |
| ------------------- | -------------- | ---------------------------------------------- |
| Pan/zoom frame time | < 16ms (60fps) | For scenes up to 50K elements                  |
| Hittest latency     | < 5ms          | Single point query in 50K scene                |
| Marquee query       | < 20ms         | Full marquee selection in 10K visible elements |
| Scene load (50K)    | < 2s           | Initial document → first render                |
| Transform preview   | < 16ms         | Multi-select batch transform with 100 elements |

---

## 10. Template & Test Strategy

### 10.1 Template Preset Coverage

Templates now carry rich metadata (`scale`, `capabilities`, `interactionScenarios`,
`performanceNotes`, `regression`, `benchmark` flags).

| Category        | Count | Scale Range                   | Purpose                            |
| --------------- | ----- | ----------------------------- | ---------------------------------- |
| Simple demos    | 3     | tiny                          | Onboarding, regression baseline    |
| Stress mixed    | 3     | medium–extreme (10K/50K/100K) | Render perf, interaction perf      |
| Image heavy     | 2     | small–large (1K/10K)          | Texture/decode stress              |
| Text dense      | 1     | small (500)                   | Text subsystem, glyph cache        |
| Deep groups     | 1     | small (200)                   | Group traversal, isolation mode    |
| Overlap heavy   | 1     | small (1K)                    | Hittest disambiguation, z-order    |
| Sparse large    | 1     | medium (5K)                   | Viewport culling, spatial sparsity |
| Transform batch | 1     | medium (2K)                   | Batch transform perf, undo memory  |

### 10.2 Missing Template Coverage (Future)

| Template                 | Why                                          |
| ------------------------ | -------------------------------------------- |
| Boolean result           | No boolean operations yet                    |
| Clip/mask                | No clip group semantics yet                  |
| Multi-artboard           | No artboard support yet                      |
| Guide/grid               | No guide data model yet                      |
| Mixed image + text dense | Combined pressure on text + image subsystems |

---

## 11. Module Map

### 11.1 vector (apps/vector-editor-web/src)

```
src/
├── app/                    # Product config, app initialization
├── adapters/               # VisionFile ↔ EditorDocument ↔ RuntimeScene bridges
├── components/             # React UI shell
│   ├── editorFrame/        #   Main layout container
│   ├── toolbar/            #   Tool rail
│   ├── header/             #   Top bar + menus
│   ├── propPanel/          #   Property inspector
│   ├── layerPanel/         #   Layer hierarchy
│   ├── historyPanel/       #   Undo/redo timeline
│   ├── statusBar/          #   Zoom level + position
│   ├── contextMenu/        #   Right-click actions
│   ├── createFile/         #   New file + template picker
│   └── workspace/          #   Canvas viewport container
├── tools/                  # [NEW] Tool registry + handler definitions
├── state/                  # [NEW] Editing mode controller, product state machines
├── interaction/            # Selection state, transform preview, overlay rendering
│   ├── selection/          #   Selection/handle builders
│   ├── transform/          #   Transform session shapes
│   ├── overlay/            #   InteractionOverlay React component
│   └── draft/              #   In-flight drawing primitives
├── hooks/                  # React hooks (runtime bridge, gestures, shortcuts)
├── features/               # Feature modules
│   └── templatePresets/    #   Template generation + test metadata
├── constants/              # Action definitions, shortcut mappings
├── contexts/               # File I/O context
├── runtime/                # App-local renderer adapter + worker entry
├── lib/                    # Shortcut + zoom plugins
├── utilities/              # Helpers
└── types/                  # Local type definitions
```

### 11.2 runtime (packages/runtime/src)

```
src/
├── core/                   # Runtime controller, kit, API, snapshot store
├── commands/               # [NEW] Command registry + handler contracts
├── interaction/            # Shared interaction algorithms
│   ├── marqueeSelection.ts
│   ├── snapping.ts
│   ├── selectionHandles.ts
│   ├── transformPreview.ts
│   ├── transformSessionManager.ts
│   ├── shapeHitTest.ts
│   ├── hitTestAdapter.ts   # [NEW] Engine→product hit-test bridge
│   ├── viewportGestures.ts
│   └── overlay/
├── presets/                # Default editor modules (selection, snap, history, protocol)
├── worker/                 # Worker protocol, scope binding, command handlers
│   └── scope/              #   Operations, hit-test, selection, patch batch
├── viewport/               # Viewport state + matrix helpers
├── gesture/                # Gesture interpreter (pointer/wheel → pan/zoom)
├── shared-memory/          # SAB layout + sync
├── extensibility/          # Plugin/module system
└── zoom/                   # Zoom preset definitions
```

### 11.3 engine (packages/engine/src)

```
src/
├── renderer/               # Canvas2D + WebGL backends, render plan, replay
├── scene/                  # Scene store, types, patch system, hit-test, indexing
├── spatial/                # RBush spatial index
├── interaction/            # Hit-test, viewport, pan, zoom, marquee, snapping, LOD, handles, transform
├── math/                   # Matrix helpers
├── animation/              # Frame clock + easing
├── time/                   # Clock + task scheduler
├── runtime/                # createEngine facade, engine loop, render scheduler
└── worker/                 # Worker capabilities, mode detection
```

---

## 12. Migration & Refactoring Recommendations

### 12.1 Incremental Migration Plan

These changes can be done independently and incrementally:

#### Phase 1: Foundation (current sprint)

1. ✅ **Command registry** in runtime — `packages/runtime/src/commands/`
2. ✅ **HitTest adapter** in runtime — `packages/runtime/src/interaction/hitTestAdapter.ts`
3. ✅ **Tool registry** in vector — `apps/vector-editor-web/src/tools/`
4. ✅ **Editing mode controller** in vector — `apps/vector-editor-web/src/state/editingMode.ts`
5. ✅ **Template test metadata** — enriched preset definitions + 5 new test templates

#### Phase 2: Integration (next sprint)

6. ✅ Wire runtime tool registry into `useEditorRuntime` (13 tools including `path` and `zoomOut`)
7. ✅ Wire runtime editing mode controller into pointer dispatch lifecycle
8. ✅ Evolve engine hitTest to multi-hit (`hitTestEngineSceneStateAll`)
9. ✅ Upgrade worker pointer selection to consume hit-test candidates (top-hit compatible)
10. ✅ Start decomposing `useEditorRuntime.ts` with extracted tooling module (`hooks/runtime/tooling.ts`)

#### Phase 3: Enrichment

11. Inspector schema registry for property panel extensibility
12. Scene bridge as first-class runtime module (extract from presets)
13. Product object semantic layer (compound path, boolean, mask group)
14. Grid/guide data model + guide snap support
15. Focus-to-selection viewport operation
16. LOD rendering implementation in engine

#### Phase 4: Polish

17. Action type discriminated union
18. Import/export format extensibility
19. Diagnostics module consolidation
20. Runtime scheduler module

### 12.2 Key Naming Corrections

| Current                         | Issue                       | Suggested                                                                                                               |
| ------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `useEditorRuntime`              | Monolithic, unclear scope   | Split into `useRuntimeBridge` + `useToolDispatch` + `useTransformSession` + `useMarqueeSession` + `useSelectionActions` |
| `presets/engineSceneAdapter`    | Mix of core bridge + preset | Move bridge part to `core/sceneBridge.ts`                                                                               |
| `interaction/types.ts` (vector) | Generic name                | Keep, but consider `canvasInteractionTypes.ts`                                                                          |

### 12.3 Module Boundary Corrections

| Current Location                        | Should Be                     | Reason                                            |
| --------------------------------------- | ----------------------------- | ------------------------------------------------- |
| `vector/src/interaction/selection/`     | Keep in vector                | Product-level selection state derivation          |
| `vector/src/interaction/overlay/`       | Keep in vector                | Product-level React overlay rendering             |
| `runtime/presets/engineSceneAdapter.ts` | `runtime/core/sceneBridge.ts` | Scene bridge is core infrastructure, not a preset |

---

## 13. Risk Register

| Risk                                                | Impact | Mitigation                                                                |
| --------------------------------------------------- | ------ | ------------------------------------------------------------------------- |
| useEditorRuntime decomposition breaks pointer flow  | High   | Incremental extraction with shared refs, test each sub-hook independently |
| Multi-hit engine API changes break existing hittest | Medium | Add new function alongside existing, migrate callers incrementally        |
| Tool registry adoption requires large refactor      | Medium | Register existing tools as thin wrappers first, then migrate logic        |
| Template generators need updates for new presets    | Low    | New presets can use existing generators with parameter variations         |
| Command registry adoption vs existing protocol      | Medium | Registry wraps existing protocol dispatch; both paths can coexist         |

---

## 14. Completed Items

- [x] Command registry design + implementation (`packages/runtime/src/commands/`)
- [x] HitTest adapter design + implementation (`packages/runtime/src/interaction/hitTestAdapter.ts`)
- [x] Tool registry design + implementation (`apps/vector-editor-web/src/tools/`)
- [x] Editing mode controller (`apps/vector-editor-web/src/state/editingMode.ts`)
- [x] Template test metadata enhancement (13 presets with scale/capability/regression/benchmark tags)
- [x] Runtime tool lifecycle registry (`packages/runtime/src/tools/registry.ts`)
- [x] Runtime editing mode controller (`packages/runtime/src/editing-modes/controller.ts`)
- [x] useEditorRuntime lifecycle wiring (tool activation + mode transitions)
- [x] Engine multi-hit API (`hitTestEngineSceneStateAll`) + scene-store `hitTestAll`
- [x] Worker candidate hit-test path (`hitTestDocumentCandidates`) with top-hit compatibility
- [x] Toolbar coverage update (path + zoomOut) and shortcut baseline update (P path, N pencil, Shift+Z zoomOut)
- [x] Architecture documentation (this file)
- [x] Gap analysis with priority tags
- [x] Data flow documentation
- [x] Performance strategy documentation
- [x] Migration plan with phases

---

## 15. For Next Agent / Developer

When picking up this work:

1. Read this document first for orientation
2. Check `docs/core/current-work.md` for active workstream status
3. Check `docs/runtime-engine-responsibility-split.md` for ownership boundaries
4. Runtime tool lifecycle + editing mode + engine multi-hit are now wired into active paths.
5. `useEditorRuntime.ts` is still the highest-impact decomposition task; continue extracting pointer/action domains.
6. Next priority: command registry integration into worker command dispatch with explicit undo contracts.
7. Next priority: dselector path sub-selection model (anchor/segment/handle types) and candidate-level hit semantics.
8. Template test metadata is enriched; next step is regression harness wiring.
9. Always validate against both `vector-editor-web` and `playground`.
