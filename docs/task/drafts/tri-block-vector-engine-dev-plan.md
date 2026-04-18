# Tri-Block + Vector/Engine Development Plan

Source blocks:

- Block A: [docs/task/drafts/1/document-model.json](docs/task/drafts/1/document-model.json) + [docs/task/drafts/1/command-model.json](docs/task/drafts/1/command-model.json)
- Block B: [docs/task/drafts/2/structured-analysis.json](docs/task/drafts/2/structured-analysis.json)
- Block C: [docs/task/drafts/3/structured-analysis.json](docs/task/drafts/3/structured-analysis.json)

## 1. Combined Product Surface Model

### 1.1 Unified shell layers

1. Canvas runtime surface: viewport, overlays, pointer interactions.
2. Left shell surface: navigation, pages, layers tree.
3. Bottom toolbelt surface: grouped tools + mode toggle.
4. Right inspector surface: page-level and shape-level panels.
5. Bottom status surface: zoom and pointer readout.

### 1.2 Unified domain model ownership

1. Document semantics stay in `@venus/document-core` (node, paint, stroke, effect, export settings).
2. Runtime interaction/session state stays in app/runtime bridge (`currentTool`, marquee, transform session, panel visibility).
3. Engine owns mechanism-only responsibilities (render, hit-test, spatial, bounds/matrix operations).

## 2. Gap Analysis vs Current Vector App

### 2.1 Already present in app

1. Shell composition and panel slots in [apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx](apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx).
2. Tool rail baseline in [apps/vector-editor-web/src/components/toolbar/Toolbar.tsx](apps/vector-editor-web/src/components/toolbar/Toolbar.tsx).
3. Layer panel and history panel components in [apps/vector-editor-web/src/components/layerPanel/LayerPanel.tsx](apps/vector-editor-web/src/components/layerPanel/LayerPanel.tsx) and [apps/vector-editor-web/src/components/historyPanel/HistoryPanel.tsx](apps/vector-editor-web/src/components/historyPanel/HistoryPanel.tsx).
4. Runtime bridge and interaction orchestration in [apps/vector-editor-web/src/editor/hooks/useEditorRuntime.ts](apps/vector-editor-web/src/editor/hooks/useEditorRuntime.ts).

### 2.2 Missing/weak pieces exposed by drafts/2+3

1. Shell-level state contract is not explicitly modeled as one schema (panel widths, collapsed state, active shell tab/mode).
2. Bottom grouped toolbelt model (primary + chevron submenu + carousel row behavior) is richer than current linear left tool rail.
3. Page-focused right sidebar contract (Page background/styles/export) and shape-focused contract (Block A) are not unified under a single inspector state machine.
4. Command id namespace is implied in UI but not standardized end-to-end for telemetry/testability.

## 3. Development Strategy (Phased)

## Phase 0: Schema Freeze (1-2 days)

1. Create a single `editor-shell-schema` TypeScript surface in app layer.
2. Include:

- `ShellLayoutState` (left/right widths, minimized panels, active inspector kind).
- `ToolbeltState` (current tool, group, mode, carousel row).
- `InspectorContext` (`page` or `selection`).

3. Map fields from block A/B/C schemas to this surface.
4. Add unit tests for serialization/deserialization.

Deliverables:

- New app-local types module under `apps/vector-editor-web/src/editor/shell/state`.

## Phase 1: Command Surface Unification (2-4 days)

1. Introduce stable command ids from block A/B/C into one registry in app layer.
2. Route UI events through one adapter function:

- `dispatchShellCommand(commandId, payload, meta)`

3. Keep execution targets unchanged initially (`executeAction`, runtime handlers).
4. Add analytics/test metadata (`sourcePanel`, `sourceControl`, `commitType`, `undoGroupId`).

Deliverables:

- Command map file + type-safe payload map.
- Thin adapters in `Toolbar`, `LayerPanel`, `PropPanel`, page sidebar.

## Phase 2: Toolbelt Refactor (3-5 days)

1. Evolve current left rail to grouped-tool model from block C:

- Primary button + submenu chevron.
- Optional compact/overflow row state.

2. Add mode segmented control (`draw/design/handoff`) with persistence.
3. Keep runtime boundary strict:

- Mode changes should update app/runtime policy only.
- No engine-specific UI policy leakage.

Deliverables:

- New `Toolbelt` component (or replace current `Toolbar`) in app layer.

## Phase 3: Inspector State Machine (3-5 days)

1. Build inspector context switcher:

- `page` context -> page background/styles/export (block B).
- `selection` context -> transform/appearance/fill/stroke/effects (block A).

2. Normalize panel rendering from a declarative section config.
3. Ensure panel state restoration works with minimize/restore rail.

Deliverables:

- Inspector orchestrator in app layer.
- Section definition files derived from block A/B schemas.

## Phase 4: Runtime/Engine Alignment Hardening (2-4 days)

1. Explicitly document command ownership routing:

- App-only commands (shell chrome, panel open/close).
- Runtime commands (selection, transform, zoom, history).
- Engine-mechanism calls only behind runtime facades.

2. Add boundary tests to prevent direct app -> engine mutation paths.
3. Verify render-prep/incremental path compatibility with new command metadata.

Deliverables:

- Boundary tests + docs updates.

## 4. Suggested File-Level Worklist

1. Add shell schema:

- `apps/vector-editor-web/src/editor/shell/state/shellState.ts`
- `apps/vector-editor-web/src/editor/shell/state/toolbeltState.ts`
- `apps/vector-editor-web/src/editor/shell/state/inspectorState.ts`

2. Add command registry:

- `apps/vector-editor-web/src/editor/shell/commands/shellCommandRegistry.ts`
- `apps/vector-editor-web/src/editor/shell/commands/shellCommandDispatch.ts`

3. Add toolbelt component:

- `apps/vector-editor-web/src/components/toolbelt/Toolbelt.tsx`

4. Add inspector orchestrator:

- `apps/vector-editor-web/src/components/inspector/InspectorHost.tsx`
- `apps/vector-editor-web/src/components/inspector/sections/*`

5. Integrate into frame:

- Update [apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx](apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx)

## 5. Risks and Controls

1. Risk: command id drift between UI and runtime handlers.

- Control: compile-time payload map and centralized dispatcher.

2. Risk: shell refactor regresses interaction latency.

- Control: keep high-frequency pointer logic in runtime/engine path, avoid React state in hot loops.

3. Risk: inspector dual-context complexity.

- Control: single context enum + declarative section config + snapshot tests.

## 6. Execution Order Recommendation

1. Phase 0 + Phase 1 first (schema + command surface).
2. Phase 2 toolbelt migration (lowest domain risk, high UX value).
3. Phase 3 inspector unification.
4. Phase 4 boundary/performance hardening and docs.

This sequence minimizes architecture risk while enabling incremental UI convergence to the three draft blocks.

## 7. Current Implementation Status (2026-04-17)

### 7.1 Completed in this pass

1. Phase 0 baseline:

- Added shell state schema files:
  - [apps/vector-editor-web/src/editor/shell/state/shellState.ts](apps/vector-editor-web/src/editor/shell/state/shellState.ts)
  - [apps/vector-editor-web/src/editor/shell/state/toolbeltState.ts](apps/vector-editor-web/src/editor/shell/state/toolbeltState.ts)
  - [apps/vector-editor-web/src/editor/shell/state/inspectorState.ts](apps/vector-editor-web/src/editor/shell/state/inspectorState.ts)
- Added shell state serialization/deserialization and storage integration.

2. Phase 1 baseline:

- Added command registry and dispatcher:
  - [apps/vector-editor-web/src/editor/shell/commands/shellCommandRegistry.ts](apps/vector-editor-web/src/editor/shell/commands/shellCommandRegistry.ts)
  - [apps/vector-editor-web/src/editor/shell/commands/shellCommandDispatch.ts](apps/vector-editor-web/src/editor/shell/commands/shellCommandDispatch.ts)
- Wired tool/mode/panel toggles through `dispatchShellCommand` in [apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx](apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx).

3. Phase 2 baseline:

- Added grouped bottom toolbelt component:
  - [apps/vector-editor-web/src/components/toolbelt/Toolbelt.tsx](apps/vector-editor-web/src/components/toolbelt/Toolbelt.tsx)
- Added mode segmented toggle (`draw/design/handoff`) and persistence.

4. Phase 3 baseline:

- Added inspector host and page context section:
  - [apps/vector-editor-web/src/components/inspector/InspectorHost.tsx](apps/vector-editor-web/src/components/inspector/InspectorHost.tsx)
  - [apps/vector-editor-web/src/components/inspector/sections/PageInspectorSection.tsx](apps/vector-editor-web/src/components/inspector/sections/PageInspectorSection.tsx)
- Integrated host into [apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx](apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx), with `selection/page` context switching.

5. Phase 4 baseline:

- Added boundary guard/self-check utility files:
  - [apps/vector-editor-web/src/editor/shell/tests/runtimeBoundaryGuards.ts](apps/vector-editor-web/src/editor/shell/tests/runtimeBoundaryGuards.ts)
  - [apps/vector-editor-web/src/editor/shell/tests/shellStateSelfCheck.ts](apps/vector-editor-web/src/editor/shell/tests/shellStateSelfCheck.ts)

### 7.2 Validation

1. Typecheck command run:

- `pnpm --filter @venus/vector-editor-web exec tsc -p tsconfig.app.json --noEmit`

2. Result:

- Passed (no compile errors).

### 7.3 Continuation Update (2026-04-17)

1. Phase 1 extension (panel interactions routed via command surface):

- Extended command ids and payload map in:
  - [apps/vector-editor-web/src/editor/shell/commands/shellCommandRegistry.ts](apps/vector-editor-web/src/editor/shell/commands/shellCommandRegistry.ts)
  - [apps/vector-editor-web/src/editor/shell/commands/shellCommandDispatch.ts](apps/vector-editor-web/src/editor/shell/commands/shellCommandDispatch.ts)
- New routed commands:
  - `layer.reorder`
  - `history.pick`
  - `selection.modify`
  - `element.modify`

2. Inspector integration:

- Added dispatch-backed callbacks in:
  - [apps/vector-editor-web/src/components/inspector/InspectorHost.tsx](apps/vector-editor-web/src/components/inspector/InspectorHost.tsx)
  - [apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx](apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx)
- Layer/history/property interactions now use shell command dispatch before reaching `executeAction`/`pickHistory`.

3. i18n hook exposure (fallback-safe):

- Added i18n key entry points for newly touched panel chrome strings in:
  - [apps/vector-editor-web/src/components/layerPanel/LayerPanel.tsx](apps/vector-editor-web/src/components/layerPanel/LayerPanel.tsx)
  - [apps/vector-editor-web/src/components/historyPanel/HistoryPanel.tsx](apps/vector-editor-web/src/components/historyPanel/HistoryPanel.tsx)
  - [apps/vector-editor-web/src/components/propPanel/PropPanel.tsx](apps/vector-editor-web/src/components/propPanel/PropPanel.tsx)
  - [apps/vector-editor-web/src/components/inspector/InspectorHost.tsx](apps/vector-editor-web/src/components/inspector/InspectorHost.tsx)
- All new i18n usage keeps `defaultValue` fallback behavior to avoid runtime regressions when keys are missing.

4. Validation:

- `pnpm exec tsc -p apps/vector-editor-web/tsconfig.app.json --noEmit`
- Result: passed.

### 7.4 Continuation Update (2026-04-17)

1. PropPanel i18n sweep (fallback-safe):

- Expanded i18n hook coverage for remaining hardcoded labels/section titles/actions in:
  - [apps/vector-editor-web/src/components/propPanel/PropPanel.tsx](apps/vector-editor-web/src/components/propPanel/PropPanel.tsx)
- Newly localized areas include:
  - identity/type/schema metadata labels
  - image metadata labels and action buttons
  - geometry/fill/stroke/corners/ellipse/appearance section labels

2. Command-path consistency fix:

- Replaced a remaining direct `executeAction('element-modify', ...)` branch (fill enable toggle) with the existing `patchElementProps` adapter in:
  - [apps/vector-editor-web/src/components/propPanel/PropPanel.tsx](apps/vector-editor-web/src/components/propPanel/PropPanel.tsx)
- This keeps property edits consistently routed through dispatch-backed callbacks when provided.

3. Type-safety cleanup:

- Removed local `@ts-ignore` in property numeric parsing path and replaced it with a typed numeric-field list check in:
  - [apps/vector-editor-web/src/components/propPanel/PropPanel.tsx](apps/vector-editor-web/src/components/propPanel/PropPanel.tsx)

4. Validation:

- `pnpm exec tsc -p apps/vector-editor-web/tsconfig.app.json --noEmit`
- Result: passed.

### 7.5 Continuation Update (2026-04-17)

1. Draft-4 image driven shell layout adaptation (Variant B):

- Added a Figma-like left sidebar surface (nav rail + Pages + Layers) in:
  - [apps/vector-editor-web/src/components/shellVariant/VariantBLeftSidebar.tsx](apps/vector-editor-web/src/components/shellVariant/VariantBLeftSidebar.tsx)
- Added a right sidebar surface (top controls + design/prototype tabs + properties body) in:
  - [apps/vector-editor-web/src/components/shellVariant/VariantBRightSidebar.tsx](apps/vector-editor-web/src/components/shellVariant/VariantBRightSidebar.tsx)

2. Variant-specific frame orchestration:

- Updated [apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx](apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx) to switch shell composition when `shellVariant === 'b'`:
  - hide legacy top `Header` and bottom `StatusBar`
  - render three-column shell (`VariantBLeftSidebar` + canvas + `VariantBRightSidebar`)
  - keep non-B variants on existing layout path unchanged

3. Command boundary adherence:

- Left sidebar layer row selection dispatches through existing shell command path (`selection.modify`) with metadata.
- Right sidebar property edits continue to route through `element.modify` dispatch adapter.

4. Validation:

- `pnpm exec tsc -p apps/vector-editor-web/tsconfig.app.json --noEmit`
- Result: passed.

### 7.6 Continuation Update (2026-04-17)

1. Shell state contract extension (Phase 0 refinement):

- Extended persisted shell layout schema in:
  - [apps/vector-editor-web/src/editor/shell/state/shellState.ts](apps/vector-editor-web/src/editor/shell/state/shellState.ts)
- Added `variantBSections` state branch:
  - `pagesCollapsed`
  - `layersCollapsed`
- Kept deserialization backward-compatible for existing local storage payloads.

2. Variant B left sidebar interaction refinement:

- Updated [apps/vector-editor-web/src/components/shellVariant/VariantBLeftSidebar.tsx](apps/vector-editor-web/src/components/shellVariant/VariantBLeftSidebar.tsx) to support collapsible `Pages` and `Layers` sections.
- Wired section collapse toggles through frame-owned shell layout state in:
  - [apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx](apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx)

3. Variant B right sidebar inspector context switching:

- Updated [apps/vector-editor-web/src/components/shellVariant/VariantBRightSidebar.tsx](apps/vector-editor-web/src/components/shellVariant/VariantBRightSidebar.tsx) to add `Selection/Page` context toggle controls.
- Routed context switch through shell command dispatch (`inspector.setContext`) in:
  - [apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx](apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx)

4. Minor shell chrome cleanup:

- Removed accidental stray prop on shell variant select control in:
  - [apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx](apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx)

5. Validation:

- `pnpm exec tsc -p apps/vector-editor-web/tsconfig.app.json --noEmit`
- Result: passed.

### 7.7 Continuation Update (2026-04-17)

1. Variant B left sidebar usability refinement:

- Enhanced [apps/vector-editor-web/src/components/shellVariant/VariantBLeftSidebar.tsx](apps/vector-editor-web/src/components/shellVariant/VariantBLeftSidebar.tsx) with:
  - layers search/filter input
  - section count indicators for `Pages` and `Layers`
  - empty-state copy for no layer match
- Maintained existing selection command path (`selection.modify`) while improving shell-side discovery.

2. Variant B right sidebar runtime metadata alignment:

- Enhanced [apps/vector-editor-web/src/components/shellVariant/VariantBRightSidebar.tsx](apps/vector-editor-web/src/components/shellVariant/VariantBRightSidebar.tsx) to replace static zoom text with runtime-driven zoom percent.
- Added compact shell meta row for:
  - total layer count
  - current selection count
- Wired data flow from frame runtime state in:
  - [apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx](apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx)

3. Validation:

- `pnpm exec tsc -p apps/vector-editor-web/tsconfig.app.json --noEmit`
- Result: passed.

### 7.8 Continuation Update (2026-04-17)

1. Phase 1 command surface completion for Variant B zoom controls:

- Implemented `shell.setZoom` handling in:
  - [apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx](apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx)
- Routed command to existing runtime action path (`world-zoom`) with clamped percent-to-scale conversion.

2. Variant B right sidebar zoom interaction:

- Enhanced [apps/vector-editor-web/src/components/shellVariant/VariantBRightSidebar.tsx](apps/vector-editor-web/src/components/shellVariant/VariantBRightSidebar.tsx) with:
  - zoom decrement button
  - zoom percent reset-to-100 button
  - zoom increment button
- Wired through shell dispatch in:
  - [apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx](apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx)
- This closes the interaction gap introduced by hiding the legacy bottom status bar under `shellVariant === 'b'`.

3. Validation:

- `pnpm exec tsc -p apps/vector-editor-web/tsconfig.app.json --noEmit`
- Result: passed.

### 7.9 Continuation Update (2026-04-17)

1. Canvas-first frame composition (floating shell):

- Refactored [apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx](apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx) to keep the canvas as the full-size primary layer.
- Moved left/right shell surfaces from fixed side columns to absolute floating overlays on top of the canvas.

2. Floating panel minimize/restore support:

- Added panel minimize controls to:
  - [apps/vector-editor-web/src/components/shellVariant/VariantBLeftSidebar.tsx](apps/vector-editor-web/src/components/shellVariant/VariantBLeftSidebar.tsx)
  - [apps/vector-editor-web/src/components/shellVariant/VariantBRightSidebar.tsx](apps/vector-editor-web/src/components/shellVariant/VariantBRightSidebar.tsx)
- Added frame-level restore chips and persisted panel minimize states (`leftPanelMinimized`, `rightPanelMinimized`) through:
  - [apps/vector-editor-web/src/editor/shell/state/shellState.ts](apps/vector-editor-web/src/editor/shell/state/shellState.ts)
  - [apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx](apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx)

3. Variant de-scope and style unification:

- Removed shell variant selector and branching usage from:
  - [apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx](apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx)
- Removed `data-shell-variant` color override blocks so the unified shell uses Variant A token palette baseline in:
  - [apps/vector-editor-web/src/index.css](apps/vector-editor-web/src/index.css)

4. Validation:

- `pnpm exec tsc -p apps/vector-editor-web/tsconfig.app.json --noEmit`
- Result: passed.

### 7.10 Continuation Update (2026-04-17)

1. Left icon tabs functionalization:

- Upgraded [apps/vector-editor-web/src/components/shellVariant/VariantBLeftSidebar.tsx](apps/vector-editor-web/src/components/shellVariant/VariantBLeftSidebar.tsx) from style-only icon rail to stateful tab navigation.
- Added tab switch behavior and content loading for:
  - `File`
  - `Assets`
  - `Search`
  - `Settings`
  - `Debug`
- Persisted active tab via shell layout storage in:
  - [apps/vector-editor-web/src/editor/shell/state/shellState.ts](apps/vector-editor-web/src/editor/shell/state/shellState.ts)
  - [apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx](apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx)

2. New Settings tab:

- Added settings surface to host:
  - language switch control
  - canvas grid toggle
  - snapping toggle
- Snapping now surfaces through runtime hook state/commands by extending:
  - [apps/vector-editor-web/src/editor/hooks/useEditorRuntime.types.ts](apps/vector-editor-web/src/editor/hooks/useEditorRuntime.types.ts)
  - [apps/vector-editor-web/src/editor/hooks/useEditorRuntime.ts](apps/vector-editor-web/src/editor/hooks/useEditorRuntime.ts)
- Grid visibility is app-shell level and rendered as a non-interactive canvas overlay in:
  - [apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx](apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx)

3. New Debug tab (dev diagnostics):

- Added diagnostic panel in [apps/vector-editor-web/src/components/shellVariant/VariantBLeftSidebar.tsx](apps/vector-editor-web/src/components/shellVariant/VariantBLeftSidebar.tsx) with runtime-facing fields:
  - editor frame render count
  - scene update count
  - scene version
  - shape count
  - viewport scale
  - selected count
  - scene stable-rate proxy (cache-reuse estimate based on unchanged scene revision across updates)
- Added debug metric collection in:
  - [apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx](apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx)

4. Validation:

- `pnpm exec tsc -p apps/vector-editor-web/tsconfig.app.json --noEmit`
- Result: passed.

### 7.11 Continuation Update (2026-04-17)

1. Phase 1 alignment for newly introduced shell controls:

- Extended command registry in:
  - [apps/vector-editor-web/src/editor/shell/commands/shellCommandRegistry.ts](apps/vector-editor-web/src/editor/shell/commands/shellCommandRegistry.ts)
- Added command ids and payload contracts for:
  - `shell.setLeftTab`
  - `shell.setGrid`
  - `shell.setSnapping`

2. Dispatcher and frame routing:

- Extended dispatch handler surface in:
  - [apps/vector-editor-web/src/editor/shell/commands/shellCommandDispatch.ts](apps/vector-editor-web/src/editor/shell/commands/shellCommandDispatch.ts)
- Wired left tab switching and settings toggles through dispatch in:
  - [apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx](apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx)

3. Runtime settings exposure support:

- Exposed snapping state/toggle in runtime hook contract for settings tab integration:
  - [apps/vector-editor-web/src/editor/hooks/useEditorRuntime.types.ts](apps/vector-editor-web/src/editor/hooks/useEditorRuntime.types.ts)
  - [apps/vector-editor-web/src/editor/hooks/useEditorRuntime.ts](apps/vector-editor-web/src/editor/hooks/useEditorRuntime.ts)

4. Validation:

- `pnpm exec tsc -p apps/vector-editor-web/tsconfig.app.json --noEmit`
- Result: passed.

### 7.12 Continuation Update (2026-04-17)

1. Floating panel width persistence activation:

- Activated `leftPanelWidth` and `rightPanelWidth` state usage in:
  - [apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx](apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx)
- Width values are now read from and written back to `ShellLayoutState` instead of staying as dormant schema fields.

2. Resizable floating sidebars:

- Added pointer-drag resize handles for both floating panels in:
  - [apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx](apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx)
- Added width clamp bounds to keep layout stable:
  - left panel: 260~520
  - right panel: 280~560

3. Validation:

- `pnpm exec tsc -p apps/vector-editor-web/tsconfig.app.json --noEmit`
- Result: passed.

### 7.13 Continuation Update (2026-04-17)

1. Floating sidebars switched to fixed width (non-resizable):

- Removed drag-resize handlers and separator grips from:
  - [apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx](apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx)
- Enforced fixed widths for floating shells:
  - left: `320`
  - right: `352`
- Kept minimize/restore behavior unchanged.

2. Properties geometry panel compact layout:

- Updated [apps/vector-editor-web/src/components/propPanel/PropPanel.tsx](apps/vector-editor-web/src/components/propPanel/PropPanel.tsx) to use compact two-column rows for:
  - `x / y`
  - `width / height`
- This aligns the editing density with Figma/Adobe-style inspector ergonomics.

3. Type contract consistency:

- Restored `snappingEnabled` default in [apps/vector-editor-web/src/editor/hooks/deriveEditorUIState.ts](apps/vector-editor-web/src/editor/hooks/deriveEditorUIState.ts) to match current `EditorUIState` contract.

4. Validation:

- `pnpm exec tsc -p apps/vector-editor-web/tsconfig.app.json --noEmit`
- Result: passed.

### 7.14 Continuation Update (2026-04-17)

1. Properties panel density refinement:

- Further compacted inspector numeric controls in [apps/vector-editor-web/src/components/propPanel/PropPanel.tsx](apps/vector-editor-web/src/components/propPanel/PropPanel.tsx):
  - corners arranged as paired rows (`TL/TR`, `BL/BR`)
  - ellipse angles arranged as paired row (`Start/End`)
- This keeps the right sidebar geometry editing rhythm visually consistent with the compact `x/y` and `w/h` layout.

2. Validation:

- `pnpm exec tsc -p apps/vector-editor-web/tsconfig.app.json --noEmit`
- Result: passed.

### 7.15 Continuation Update (2026-04-17)

1. Local shadcn-style UI foundation upgrade:

- Migrated local UI utility composition to shadcn-standard `clsx + tailwind-merge` in:
  - [apps/vector-editor-web/src/ui/kit/lib/utils.ts](apps/vector-editor-web/src/ui/kit/lib/utils.ts)
- Updated core primitives with shadcn-style visual system and focus semantics:
  - [apps/vector-editor-web/src/ui/kit/components/ui/button.tsx](apps/vector-editor-web/src/ui/kit/components/ui/button.tsx)
  - [apps/vector-editor-web/src/ui/kit/components/ui/input.tsx](apps/vector-editor-web/src/ui/kit/components/ui/input.tsx)
  - [apps/vector-editor-web/src/ui/kit/components/ui/panel.tsx](apps/vector-editor-web/src/ui/kit/components/ui/panel.tsx)
  - [apps/vector-editor-web/src/ui/kit/components/ui/select.tsx](apps/vector-editor-web/src/ui/kit/components/ui/select.tsx)

2. New local shadcn-compatible primitives:

- Added `Card` family primitive:
  - [apps/vector-editor-web/src/ui/kit/components/ui/card.tsx](apps/vector-editor-web/src/ui/kit/components/ui/card.tsx)
- Added `Separator` primitive:
  - [apps/vector-editor-web/src/ui/kit/components/ui/separator.tsx](apps/vector-editor-web/src/ui/kit/components/ui/separator.tsx)
- Exported both through UI kit barrel:
  - [apps/vector-editor-web/src/ui/kit/index.ts](apps/vector-editor-web/src/ui/kit/index.ts)

3. Surface-level adoption:

- Updated Variant B right inspector shell to use local `Card` + `Separator` for compact metadata row:
  - [apps/vector-editor-web/src/components/shellVariant/VariantBRightSidebar.tsx](apps/vector-editor-web/src/components/shellVariant/VariantBRightSidebar.tsx)

4. Dependency alignment:

- Added shadcn-standard utility dependencies in:
  - [apps/vector-editor-web/package.json](apps/vector-editor-web/package.json)
- Installed workspace dependencies via `pnpm install`.

5. Validation:

- `pnpm exec tsc -p apps/vector-editor-web/tsconfig.app.json --noEmit`
- Result: passed.

### 7.16 Continuation Update (2026-04-17)

1. Continued shadcn primitive adoption on shell surfaces:

- Updated left floating sidebar to consume local shadcn-style primitives from `@vector/ui`:
  - `Input`
  - `Separator`
- Changes in:
  - [apps/vector-editor-web/src/components/shellVariant/VariantBLeftSidebar.tsx](apps/vector-editor-web/src/components/shellVariant/VariantBLeftSidebar.tsx)

2. Validation:

- `pnpm exec tsc -p apps/vector-editor-web/tsconfig.app.json --noEmit`
- Result: passed.

### 7.17 Continuation Update (2026-04-17)

1. Inspector compact field system pass:

- Refactored repeated property-row layout into reusable compact helpers in:
  - [apps/vector-editor-web/src/components/propPanel/PropPanel.tsx](apps/vector-editor-web/src/components/propPanel/PropPanel.tsx)
- Applied reusable compact row/pair patterns to high-frequency controls:
  - position/size/rotation
  - fill/stroke controls
  - shadow and opacity controls
- This improves editing density and consistency with Figma/Adobe-style inspector composition.

2. Fixed-width shell consistency:

- Applied explicit fixed width constants to both floating sidebar containers in:
  - [apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx](apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx)

3. Validation:

- `pnpm exec tsc -p apps/vector-editor-web/tsconfig.app.json --noEmit`
- Result: passed.

### 7.18 Continuation Update (2026-04-17)

1. Right sidebar control surface consistency pass:

- Replaced ad-hoc accent/button styling with local shadcn-style primitive usage in:
  - [apps/vector-editor-web/src/components/shellVariant/VariantBRightSidebar.tsx](apps/vector-editor-web/src/components/shellVariant/VariantBRightSidebar.tsx)
- Areas updated:
  - top identity badge color normalization
  - `Share` action button moved to `Button` variant-driven style
  - zoom control chips moved to `Button` primitive variants (`ghost`/`outline`)

2. Validation:

- `pnpm exec tsc -p apps/vector-editor-web/tsconfig.app.json --noEmit`
- Result: passed.

### 7.19 Continuation Update (2026-04-17)

1. Global UI standards tokenization:

- Added shared UI token surface in:
  - [apps/vector-editor-web/src/index.css](apps/vector-editor-web/src/index.css)
- Standardized token groups:
  - icon size / button icon size
  - font family and size scale
  - spacing scale (padding/margin)
  - border width and border colors
  - primary/secondary color roles
  - hover background and hover speed

2. Primitive alignment to standards:

- Updated shared primitives to consume tokenized styles:
  - [apps/vector-editor-web/src/ui/kit/components/ui/button.tsx](apps/vector-editor-web/src/ui/kit/components/ui/button.tsx)
  - [apps/vector-editor-web/src/ui/kit/components/ui/input.tsx](apps/vector-editor-web/src/ui/kit/components/ui/input.tsx)
  - [apps/vector-editor-web/src/ui/kit/components/ui/panel.tsx](apps/vector-editor-web/src/ui/kit/components/ui/panel.tsx)
  - [apps/vector-editor-web/src/ui/kit/components/ui/select.tsx](apps/vector-editor-web/src/ui/kit/components/ui/select.tsx)

3. Select recursive child-level standardization:

- Added `level` support to `SelectItem` in:
  - [apps/vector-editor-web/src/ui/kit/components/ui/select.tsx](apps/vector-editor-web/src/ui/kit/components/ui/select.tsx)
- Added level-driven indentation through shared CSS class in:
  - [apps/vector-editor-web/src/index.css](apps/vector-editor-web/src/index.css)
- This enables consistent recursive option hierarchy rendering via depth-based indent.

4. Icon size consistency pass on active shell surfaces:

- Introduced local sidebar icon size constants and replaced ad-hoc literals in:
  - [apps/vector-editor-web/src/components/shellVariant/VariantBLeftSidebar.tsx](apps/vector-editor-web/src/components/shellVariant/VariantBLeftSidebar.tsx)
  - [apps/vector-editor-web/src/components/shellVariant/VariantBRightSidebar.tsx](apps/vector-editor-web/src/components/shellVariant/VariantBRightSidebar.tsx)

5. Validation:

- `pnpm exec tsc -p apps/vector-editor-web/tsconfig.app.json --noEmit`
- Result: passed.

### 7.20 Continuation Update (2026-04-17)

1. Shared shell control standards enforcement:

- Added token-driven border/hover behavior for shell buttons/chips in:
  - [apps/vector-editor-web/src/index.css](apps/vector-editor-web/src/index.css)
- Standardized:
  - border width
  - border colors
  - hover background
  - hover transition speed

2. Global icon sizing consistency:

- Added shared SVG icon sizing rules for shell control classes in:
  - [apps/vector-editor-web/src/index.css](apps/vector-editor-web/src/index.css)
- Bound icon-button SVG sizing to `--venus-ui-button-icon-size` in:
  - [apps/vector-editor-web/src/ui/kit/components/ui/button.tsx](apps/vector-editor-web/src/ui/kit/components/ui/button.tsx)

3. Validation:

- `pnpm exec tsc -p apps/vector-editor-web/tsconfig.app.json --noEmit`
- Result: passed.

### 7.21 Continuation Update (2026-04-17)

1. Left sidebar semantic and functional completion:

- Rebuilt [apps/vector-editor-web/src/components/shellVariant/VariantBLeftSidebar.tsx](apps/vector-editor-web/src/components/shellVariant/VariantBLeftSidebar.tsx) with semantic structures:
  - `tablist` for icon tabs
  - `list` for flat sections
  - `tree/treeitem` for layer hierarchy rows
- Reduced non-highlight emphasis by applying muted text style on inactive rows/tabs.
- Kept section collapse behavior for pages and layers with proper scoped toggles.

2. Requested tabs added and wired:

- Added/activated tabs:
  - `File`
  - `Assets`
  - `Search`
  - `Settings` (language, grid, snapping)
  - `Debug` (render/stability/cache-estimate stats)

3. Frame-level wiring and runtime data integration:

- Updated [apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx](apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx) to:
  - persist and drive active left tab
  - wire grid/snapping toggles
  - render optional grid overlay
  - collect and pass debug metrics (`render count`, `scene update count`, `cache hit/miss estimate`, `hit rate`)

4. Command surface extension for sidebar controls:

- Extended shell command contracts in:
  - [apps/vector-editor-web/src/editor/shell/commands/shellCommandRegistry.ts](apps/vector-editor-web/src/editor/shell/commands/shellCommandRegistry.ts)
  - [apps/vector-editor-web/src/editor/shell/commands/shellCommandDispatch.ts](apps/vector-editor-web/src/editor/shell/commands/shellCommandDispatch.ts)
- Added command ids:
  - `shell.setLeftTab`
  - `shell.setGrid`
  - `shell.setSnapping`

5. Validation:

- `pnpm exec tsc -p apps/vector-editor-web/tsconfig.app.json --noEmit`
- Result: passed.

### 7.22 Continuation Update (2026-04-17)

1. Right sidebar semantic parity follow-up:

- Updated [apps/vector-editor-web/src/components/shellVariant/VariantBRightSidebar.tsx](apps/vector-editor-web/src/components/shellVariant/VariantBRightSidebar.tsx) to align context switch with semantic tab patterns:
  - `tablist` / `tab` / `tabpanel`
  - inactive state text deemphasis (`venus-shell-text-muted`)

2. Validation:

- `pnpm exec tsc -p apps/vector-editor-web/tsconfig.app.json --noEmit`
- Result: passed.

### 7.23 Continuation Update (2026-04-17)

1. True collapsible layer tree behavior:

- Extended left sidebar layer tree rows to support branch expand/collapse semantics in:
  - [apps/vector-editor-web/src/components/shellVariant/VariantBLeftSidebar.tsx](apps/vector-editor-web/src/components/shellVariant/VariantBLeftSidebar.tsx)
- Added:
  - collapse state per group node
  - `aria-expanded` behavior on expandable tree items
  - branch toggle affordance via local chevron control

2. Validation:

- `pnpm exec tsc -p apps/vector-editor-web/tsconfig.app.json --noEmit`
- Result: passed.

### 7.24 Continuation Update (2026-04-17)

1. Debug metrics enhancement for runtime cadence:

- Added sampled FPS metric collection in:
  - [apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx](apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx)
- Extended debug stats display in:
  - [apps/vector-editor-web/src/components/shellVariant/VariantBLeftSidebar.tsx](apps/vector-editor-web/src/components/shellVariant/VariantBLeftSidebar.tsx)

2. Validation:

- `pnpm exec tsc -p apps/vector-editor-web/tsconfig.app.json --noEmit`
- Result: passed.

### 7.25 Continuation Update (2026-04-17)

1. Removed top-right badge/toast notification surface:

- Disabled notification rendering container in:
  - [apps/vector-editor-web/src/ui/kit/components/ui/notification.tsx](apps/vector-editor-web/src/ui/kit/components/ui/notification.tsx)
- Kept notification context/provider contract intact to avoid breaking existing `useNotification` call sites.

2. Validation:

- `pnpm exec tsc -p apps/vector-editor-web/tsconfig.app.json --noEmit`
- Result: passed.

### 7.26 Continuation Update (2026-04-17)

1. Create-file template picker semantic/UI standardization:

- Updated preset selection surface in:
  - [apps/vector-editor-web/src/components/createFile/TemplatePresetPicker.tsx](apps/vector-editor-web/src/components/createFile/TemplatePresetPicker.tsx)
- Changes:
  - switched preset rows from native `button` styling to shared `Button` variants (`default`/`outline`)
  - added `listbox`/`option` semantics with `aria-selected`
  - removed hardcoded blue CTA override and reused tokenized `primary` button style

2. Validation:

- `pnpm exec tsc -p apps/vector-editor-web/tsconfig.app.json --noEmit`
- Result: passed.

### 7.27 Continuation Update (2026-04-17)

1. Canvas-focus visual softening and shell sizing:

- Updated shell token palette to softer border/surface/active contrast in:
  - [apps/vector-editor-web/src/index.css](apps/vector-editor-web/src/index.css)
- Unified shell borders and separators through shared token values, including:
  - `--venus-shell-border`
  - `--venus-shell-border-soft`
  - `--venus-shell-divider`
- Enforced floating panel widths in:
  - [apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx](apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx)
- Applied requested dimensions:
  - left panel: `56 + 240` (outer width `296`)
  - right panel: `240`

2. Left and right panel internal re-layout:

- Rebalanced left panel spacing and hierarchy density in:
  - [apps/vector-editor-web/src/components/shellVariant/VariantBLeftSidebar.tsx](apps/vector-editor-web/src/components/shellVariant/VariantBLeftSidebar.tsx)
- Rebalanced right panel chrome to reduce visual dominance in:
  - [apps/vector-editor-web/src/components/shellVariant/VariantBRightSidebar.tsx](apps/vector-editor-web/src/components/shellVariant/VariantBRightSidebar.tsx)

3. Create-file entry moved into Assets with category grouping:

- Added categorized Assets blocks (Document / Media / Library) in:
  - [apps/vector-editor-web/src/components/shellVariant/VariantBLeftSidebar.tsx](apps/vector-editor-web/src/components/shellVariant/VariantBLeftSidebar.tsx)
- Added actions in Assets:
  - `Create File`
  - `Template`
- Wired actions from frame shell orchestration in:
  - [apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx](apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx)

4. Context menu moved onto shared menu component with unified item height:

- Refactored shared menu primitive to tokenized button-based menu item in:
  - [apps/vector-editor-web/src/ui/kit/components/ui/menu.tsx](apps/vector-editor-web/src/ui/kit/components/ui/menu.tsx)
- Added global menu item height token and hover/border treatment in:
  - [apps/vector-editor-web/src/index.css](apps/vector-editor-web/src/index.css)
- Migrated editor context menu rendering to shared `MenuItem` + `Separator` primitives in:
  - [apps/vector-editor-web/src/components/contextMenu/ContextMenu.tsx](apps/vector-editor-web/src/components/contextMenu/ContextMenu.tsx)

5. Inspector Fill and Stroke compact multi-column refresh:

- Reworked section to compact 2-column arrangement with icon headers and smaller text in:
  - [apps/vector-editor-web/src/components/propPanel/PropPanel.tsx](apps/vector-editor-web/src/components/propPanel/PropPanel.tsx)

6. Compatibility follow-up:

- Adjusted `HistoryPanel` menu-item ref type to button for shared menu primitive compatibility in:
  - [apps/vector-editor-web/src/components/historyPanel/HistoryPanel.tsx](apps/vector-editor-web/src/components/historyPanel/HistoryPanel.tsx)

7. Validation:

- `pnpm exec tsc -p apps/vector-editor-web/tsconfig.app.json --noEmit`
- Result: passed.

### 7.28 Continuation Update (2026-04-17)

1. Right inspector text-content editing disabled:

- Updated text-node section in:
  - [apps/vector-editor-web/src/components/propPanel/PropPanel.tsx](apps/vector-editor-web/src/components/propPanel/PropPanel.tsx)
- Text content is now read-only in the right properties panel to avoid conflicting with partial text-range editing workflows.

2. Tooltip and trigger coverage (i18n wired):

- Added/normalized i18n-backed tooltip titles on shell trigger controls in:
  - [apps/vector-editor-web/src/components/shellVariant/VariantBLeftSidebar.tsx](apps/vector-editor-web/src/components/shellVariant/VariantBLeftSidebar.tsx)
  - [apps/vector-editor-web/src/components/shellVariant/VariantBRightSidebar.tsx](apps/vector-editor-web/src/components/shellVariant/VariantBRightSidebar.tsx)
  - [apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx](apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx)
  - [apps/vector-editor-web/src/components/language/languageSwitcher.tsx](apps/vector-editor-web/src/components/language/languageSwitcher.tsx)
  - [apps/vector-editor-web/src/components/header/menu/MenuItem.tsx](apps/vector-editor-web/src/components/header/menu/MenuItem.tsx)

3. Language switch reliability fix and locale completion:

- Added language persistence/recovery (`localStorage`) and `supportedLngs` in:
  - [apps/vector-editor-web/src/i18n/config.ts](apps/vector-editor-web/src/i18n/config.ts)
- Added tooltip translation keys (en/cn/jp) in:
  - [apps/vector-editor-web/src/i18n/en/ui.json](apps/vector-editor-web/src/i18n/en/ui.json)
  - [apps/vector-editor-web/src/i18n/cn/ui.json](apps/vector-editor-web/src/i18n/cn/ui.json)
  - [apps/vector-editor-web/src/i18n/jp/ui.json](apps/vector-editor-web/src/i18n/jp/ui.json)

4. Assets/Create Template flow update:

- Removed `Create File` action from Assets panel and retained template-only creation trigger in:
  - [apps/vector-editor-web/src/components/shellVariant/VariantBLeftSidebar.tsx](apps/vector-editor-web/src/components/shellVariant/VariantBLeftSidebar.tsx)
- Kept template picker opening flow in frame orchestration while removing obsolete assets-create callback wiring in:
  - [apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx](apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx)

5. Left rail standalone menu trigger:

- Added a dedicated icon button above tab heads to open the existing header menu set (file/edit/shape/layer) in:
  - [apps/vector-editor-web/src/components/shellVariant/VariantBLeftSidebar.tsx](apps/vector-editor-web/src/components/shellVariant/VariantBLeftSidebar.tsx)
- Reused existing menu definitions/components:
  - [apps/vector-editor-web/src/components/header/menu/menuData.ts](apps/vector-editor-web/src/components/header/menu/menuData.ts)
  - [apps/vector-editor-web/src/components/header/menu/MenuItem.tsx](apps/vector-editor-web/src/components/header/menu/MenuItem.tsx)

6. Button/tab default visual rule refinement:

- Updated shell button baseline so default state has no visible border/background; hover and active retain emphasis in:
  - [apps/vector-editor-web/src/index.css](apps/vector-editor-web/src/index.css)

7. Validation:

- `pnpm exec tsc -p apps/vector-editor-web/tsconfig.app.json --noEmit`
- Result: passed.

### 7.29 Continuation Update (2026-04-17)

1. Tooltip coverage hardening:

- Added Button-level tooltip fallback so triggers with `aria-label` automatically surface a tooltip title in:
  - [apps/vector-editor-web/src/ui/kit/components/ui/button.tsx](apps/vector-editor-web/src/ui/kit/components/ui/button.tsx)
- This improves baseline tooltip consistency for shell/menu/context actions.

2. Language switch reliability reinforcement:

- Confirmed language persistence/recovery path by keeping i18n language state synced to local storage in:
  - [apps/vector-editor-web/src/i18n/config.ts](apps/vector-editor-web/src/i18n/config.ts)
- Current behavior: language selection persists across reload and restores on startup.

3. Create template flow fix (explicit apply action):

- Updated template picker action area to a stable footer with explicit Apply CTA in:
  - [apps/vector-editor-web/src/components/createFile/TemplatePresetPicker.tsx](apps/vector-editor-web/src/components/createFile/TemplatePresetPicker.tsx)
- Added locale keys for apply CTA in:
  - [apps/vector-editor-web/src/i18n/en/ui.json](apps/vector-editor-web/src/i18n/en/ui.json)
  - [apps/vector-editor-web/src/i18n/cn/ui.json](apps/vector-editor-web/src/i18n/cn/ui.json)
  - [apps/vector-editor-web/src/i18n/jp/ui.json](apps/vector-editor-web/src/i18n/jp/ui.json)

4. Menu hierarchy behavior correction:

- Fixed context menu parent-node behavior for multi-level menus in:
  - [apps/vector-editor-web/src/components/contextMenu/ContextMenu.tsx](apps/vector-editor-web/src/components/contextMenu/ContextMenu.tsx)
- Parent items with children no longer dispatch actions directly, preserving N-level expansion behavior.

5. Border/separator unification completion pass:

- Added token-based override mapping for common Tailwind border/divider utility classes in:
  - [apps/vector-editor-web/src/index.css](apps/vector-editor-web/src/index.css)
- This aligns remaining gray border usages with shell border tokens.

6. Validation:

- `pnpm exec tsc -p apps/vector-editor-web/tsconfig.app.json --noEmit`
- Result: passed.

### 7.30 Continuation Update (2026-04-17)

1. Tooltip audit follow-up (trigger coverage expansion):

- Extended shared button tooltip fallback logic in:
  - [apps/vector-editor-web/src/ui/kit/components/ui/button.tsx](apps/vector-editor-web/src/ui/kit/components/ui/button.tsx)
- Behavior:
  - priority: explicit `title` -> `aria-label` -> direct string child content
  - improves tooltip coverage for trigger-style buttons without manual `title` duplication

2. N-level menu interaction robustness:

- Updated nested menu item behavior to support click-to-toggle for parent rows with children in:
  - [apps/vector-editor-web/src/components/header/menu/MenuItem.tsx](apps/vector-editor-web/src/components/header/menu/MenuItem.tsx)
- Preserves recursive submenu expansion while preventing accidental parent action dispatch.

3. Page inspector trigger tooltip + i18n completion:

- Added i18n-driven labels and tooltips to page inspector action controls (checkbox/color trigger) in:
  - [apps/vector-editor-web/src/components/inspector/sections/PageInspectorSection.tsx](apps/vector-editor-web/src/components/inspector/sections/PageInspectorSection.tsx)
- Added locale keys:
  - [apps/vector-editor-web/src/i18n/en/ui.json](apps/vector-editor-web/src/i18n/en/ui.json)
  - [apps/vector-editor-web/src/i18n/cn/ui.json](apps/vector-editor-web/src/i18n/cn/ui.json)
  - [apps/vector-editor-web/src/i18n/jp/ui.json](apps/vector-editor-web/src/i18n/jp/ui.json)

4. Border color unification completion pass:

- Expanded shell token mapping for remaining gray border utility classes (`100~900` coverage) in:
  - [apps/vector-editor-web/src/index.css](apps/vector-editor-web/src/index.css)
- This reduces residual non-tokenized border color drift across older component surfaces.

5. Validation:

- `pnpm exec tsc -p apps/vector-editor-web/tsconfig.app.json --noEmit`
- Result: passed.
