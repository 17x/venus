# Changelog

- Fixed extreme LOD degradation during fast panning by introducing
  **screen-size-aware rendering quality decision** in lodProfile:
  - added `maxElementScreenDimension` parameter to `EngineCanvasLodProfileInput`
  - when largest element ≥ 200px in screen space (readable, near), preserve
    full rendering quality even during fast interaction (panning/zooming)
  - only enter aggressive interactive degradation when all elements are
    small/far (< 50px effective screen size)
  - this prevents shape loss and text disappearance while user is viewing
    large/readable elements, while still maintaining motion smoothness
  - computed in `canvasAdapter.tsx` from shape dimensions × viewport scale
  - resolves: "near-field elements become blocks during fast panning"
- Upgraded engine LOD policy in
  `packages/engine/src/interaction/lodProfile.ts` from static
  scene-size thresholds to a velocity-aware profile that now considers:
  - scene pressure (`shapeCount`, `imageCount`)
  - zoom scale (`scale`)
  - previous LOD level hysteresis (`previousLodLevel`)
- Extended LOD profile output with runtime tuning hints:
  - `targetDpr`
  - `interactiveIntervalMs`
- Wired vector canvas runtime to use the new LOD signals in
  `apps/vector-editor-web/src/editor/runtime/canvasAdapter.tsx`:
  - derives viewport motion velocity from pan + zoom deltas
  - feeds velocity + previous LOD into `resolveCanvasLodProfile`
  - applies dynamic interaction-time DPR via `engine.setDpr(...)`
  - forwards `targetDpr` into renderer props for explicit LOD->render bridge
- Added WebGL interaction-time degradation path in
  `packages/engine/src/renderer/webgl.ts`:
  - skip model-complete Canvas2D composite while `quality=interactive`
    interacting, falling back to solid text bounds quads for motion stability
- Expanded WebGL diagnostics propagation:
  - engine render stats now expose optional WebGL counters
    (`webglRenderPath`, text fallback/upload/cache metrics,
    composite upload bytes)
  - vector runtime diagnostics/event snapshot schema now includes these fields
  - debug panel now renders WebGL path/fallback/upload counters for live tuning

## 2026-04-18

- Mirrored runtime source into vector app at
  `apps/vector-editor-web/src/editor/runtime-local/*`.
- Remapped vector runtime imports to app-local mirror in
  `apps/vector-editor-web/tsconfig.app.json` and
  `apps/vector-editor-web/vite.config.ts` for:
  - `@venus/runtime`
  - `@venus/runtime/engine`
  - `@venus/runtime/interaction`
  - `@venus/runtime/worker`
  - `@venus/runtime/shared-memory`
  - `@venus/runtime/presets`
- Updated vector package dependencies:
  - removed `@venus/runtime`
  - added direct `@venus/engine`
- Updated vector TS project references:
  - removed `../../packages/runtime/tsconfig.json`
  - added `../../packages/engine/tsconfig.json`
- Verification:
  - `pnpm install`
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm --filter @venus/vector-editor-web build`
- Continued cleanup:
  - migrated vector runtime namespace from `@venus/runtime*` to
    `@vector/runtime*` (including `runtime-local` internals and app imports)
  - removed root TS graph references to deleted runtime package and ignored
    playground in root project references
  - deleted `packages/runtime`
  - removed playground workspace dependency/reference to deleted runtime package
    (`apps/playground/package.json`, `apps/playground/tsconfig.app.json`)
- Menu fixes:
  - fixed context menu nested submenu hover reliability in
    `apps/vector-editor-web/src/components/contextMenu/ContextMenu.tsx`
    with explicit submenu open-state + relatedTarget leave guards
  - aligned left-sidebar main menu popup placement/visual container to context
    menu behavior in
    `apps/vector-editor-web/src/components/shell/LeftSidebar.tsx`
- Vector editor UI semantic migration and regression fixes:
  - normalized language switching to `zh-CN` with resilient language-code
    resolution in `apps/vector-editor-web/src/i18n/ui.ts`
  - migrated header/left/context menu item styling to semantic
    `venus-ui-menu-item` classes and restored open-state trigger visuals
  - removed left sidebar Find tab and aligned shell tab unions/state
    (`shellCommandRegistry.ts`, `shellState.ts`, `LeftSidebar.tsx`)
  - removed synthetic `page-frame` scene injection and page-frame-only
    save filtering so frame behaves as a normal document node
    (`fileFormatScene.ts`, `fileDocument.ts`)
  - added default tooltip behavior to shared `Button`/`IconButton` with
    explicit `noTooltip` opt-out for wrapped Tooltip call-sites
  - refactored template preset picker into option/details layout with
    fixed action footer and tokenized shell surfaces
  - blocked inspector text-content patching (`text`/`textRuns`) to preserve
    canvas-side partial text editing behavior
  - left sidebar and layer-list behavior refinements:
    - minimized left panel now keeps fixed width with file name and explicit
      restore controls instead of collapsing to a floating chip
    - minimized left panel mode now uses a fixed 48px header strip with
      file icon + file name + restore icon button only
    - minimized left rail Menu icon now opens the main dropdown menu directly
      without requiring panel restore first
    - layer list now supports horizontal scrolling with non-truncated layer names
    - layer header count removed and section trigger expanded to full-width
    - layer section title trigger is left-aligned; layer rows now align by
      collapse/icon indent anchors
    - layer row lock/hide controls now follow hover/persistent visibility rules
      (locked rows keep lock + hidden-eye indicators visible)
    - layer row hover controls are now sticky to the right edge and do not
      drift with horizontal scrolling
    - left tab rail rhythm normalized (button sizing/spacing + rail divider and
      inner padding), and active tab emphasis aligned to shell active color token
      with explicit active border/background treatment
    - IconInput field behavior refinements:
      - text is left-aligned
      - unit suffix is rendered inline with value text (for example `100°`)
      - numeric spinner arrows are removed from this input path
    - right-side inspector no longer shows `px` suffix tags in numeric fields
    - selection/property section blocks now share consistent padding and
      divider treatment, with redundant standalone separators removed
    - toolbelt group controls now use explicit button-group visuals:
      primary tool button + select trigger button
    - hidden layer rows now render muted gray label text
    - layer-tree first-level subitem text now aligns to parent label baseline
      (no longer aligned to parent icon anchor)
    - layer list interaction completion:
      - horizontal scrolling disabled (`overflow-x-hidden`) for stable row layout
      - row-level lock/visibility toggles now dispatch real `element.modify`
        updates instead of local-only visual state
      - new layer batch action bar (lock/unlock, show/hide selected)
        dispatches bulk per-selection `element.modify` updates
    - assets panel interaction completion:
      - card hover/focus visual feedback enhanced (lift, ring, hover hint strip)
      - card quick actions split into `New` and `Template`
      - double-click and Enter/Space on cards now route to new-file flow
      - details panel action area now includes a dedicated `New file` action
    - shell state cleanup: removed stale `pagesCollapsed` from
      `variantBSections` persistence model
  - toolbelt grouped controls now support direct one-click quick select on
    the currently displayed group icon, with submenu kept on chevron trigger
    - projected node-level visibility/lock metadata into derived `LayerItem`
      values (`deriveEditorUIState.ts`, `useEditorRuntime.types.ts`)
    - closure sweep for tooltip/type/token consistency:
      - tokenized remaining border/text gray hardcodes in high-traffic surfaces
        (`statusBar/ZoomSelect.tsx`, `styleControls/ColorSwatchPicker.tsx`,
        `layerPanel/LayerPanel.tsx`, `print/print.tsx`)
      - completed native button tooltip backfill in print action surface
      - fixed UI-kit type mismatches with current Base UI APIs:
        - removed unsupported `onOpenAutoFocus` pass-through in modal wrapper
        - guarded nullable select values before value coercion callback
        - removed unsupported `nativeButton` props from tooltip trigger wrapper
    - text typography controls:
      - added a dedicated font picker popover in inspector (search + preview list)
        for text elements in `apps/vector-editor-web/src/components/propPanel/PropPanel.tsx`
      - enabled style-only `textRuns` patching from inspector so font-family
        updates flow to runtime text rendering while still blocking direct text
        content mutation
    - keyboard interaction conflict fix:
      - hardened global shortcut handling in
        `apps/vector-editor-web/src/lib/shortcut/shortcut.ts` to skip
        editable/interactive UI targets (`input`, `textarea`, `select`,
        `button`, contenteditable, and menu-like role surfaces)
      - added composition/IME safety guard (`event.isComposing` / `Process` key)
        so global hotkeys do not interrupt in-progress text input composition
      - wired editor-focus gating into shortcut registration in
        `apps/vector-editor-web/src/editor/hooks/useShortcut.tsx` so
        browser/UI default key behavior is not blocked when editor is unfocused
      - added focus-loss fallback in `useShortcut` to restore the previous tool
        when temporary `space` panning is active and focus leaves editor before keyup
    - packages/ui migration verification:
      - audited vector app import/dependency surface and confirmed no residual
        `@venus/ui` or workspace `packages/ui` runtime dependency usage remains
  - verification:
    - `pnpm typecheck`
    - `pnpm --filter @venus/vector-editor-web lint`
    - `pnpm --filter @venus/vector-editor-web build`

## 2026-04-16

- Added vector-local interaction runtime entry at
  `apps/vector-editor-web/src/editor/interaction/runtime/index.ts`.
- Added vector-local zoom policy module at
  `apps/vector-editor-web/src/editor/interaction/runtime/zoomPresets.ts`
  and switched zoom preset UI usage to this local entry.
- Rewired vector app interaction imports from direct
  `@venus/runtime/interaction` usage to the local runtime-interaction entry
  across editor hooks/runtime adapters/overlay/status bar.
- Added migration-safe local passthrough wrappers for
  `selectionHandles`, `snapping`, and `viewportGestures` to keep boundary-safe
  behavior while preparing deeper Phase-1 localization.
- Localized additional interaction strategy modules into vector app:
  - `apps/vector-editor-web/src/editor/interaction/runtime/selectionResolve.ts`
  - `apps/vector-editor-web/src/editor/interaction/runtime/transformTargets.ts`
- Updated local interaction runtime barrel to export the localized
  `selectionResolve`/`transformTargets` implementations instead of passthrough.
- Localized additional interaction resolve modules into vector app:
  - `apps/vector-editor-web/src/editor/interaction/runtime/selectionHandleResolve.ts`
  - `apps/vector-editor-web/src/editor/interaction/runtime/transformPreviewResolve.ts`
- Updated local interaction runtime barrel to use the localized resolve exports
  (`resolveSelectionHandleHitAtPoint`, `resolveDragStartTransformPayload`,
  `resolveSnappedTransformPreview`).
- Localized pointer-up resolve policy module into vector app:
  - `apps/vector-editor-web/src/editor/interaction/runtime/pointerUpResolve.ts`
- Updated local interaction runtime barrel to use localized pointer-up exports
  (`resolvePointerUpTransformCommit`, `resolvePointerUpMarqueeSelection`).
- Added additional vector-local interaction modules:
  - `apps/vector-editor-web/src/editor/interaction/runtime/marqueeApplyController.ts`
  - `apps/vector-editor-web/src/editor/interaction/runtime/selectionDragController.ts`
  - `apps/vector-editor-web/src/editor/interaction/runtime/selectionHierarchy.ts`
- Normalized blocked interaction chain through local wrapper entry files
  (`marqueeSelection`, `shapeHitTest`, `selectionPointerPolicy`, `selectionHandles`)
  so vector app imports stay app-local while preserving compile stability.
- Expanded `packages/runtime/src/engine.ts` facade export surface for future
  deeper localization, with follow-up required after existing runtime
  `commands/registry.ts` connector build errors are resolved.
- Removed incomplete connector prototype branch from
  `packages/runtime/src/commands/registry.ts` to restore runtime declaration
  build stability.
- Verified runtime package declaration build passes:
  `pnpm exec tsc -b packages/runtime/tsconfig.json`.
- Re-promoted previously wrapped interaction modules to vector-local
  implementations:
  - `apps/vector-editor-web/src/editor/interaction/runtime/marqueeSelection.ts`
  - `apps/vector-editor-web/src/editor/interaction/runtime/shapeHitTest.ts`
  - `apps/vector-editor-web/src/editor/interaction/runtime/selectionPointerPolicy.ts`
  - `apps/vector-editor-web/src/editor/interaction/runtime/selectionHandles.ts`
- Verified vector app compile after re-promotion:
  `pnpm exec tsc -p apps/vector-editor-web/tsconfig.app.json --noEmit`.

## 2026-04-17

- Localized remaining interaction wrappers into vector app implementations:
  - `apps/vector-editor-web/src/editor/interaction/runtime/snapping.ts`
  - `apps/vector-editor-web/src/editor/interaction/runtime/viewportGestures.ts`
- Expanded `packages/runtime/src/engine.ts` facade to expose snapping and
  viewport gesture helpers required by vector-local interaction modules.
- Rebuilt runtime package declarations after facade extension:
  `pnpm exec tsc -b packages/runtime/tsconfig.json`.
- Added Phase-2 render-prep skeleton files in vector app:
  - `apps/vector-editor-web/src/editor/render-prep/types.ts`
  - `apps/vector-editor-web/src/editor/render-prep/prepareScenePass.ts`
  - `apps/vector-editor-web/src/editor/render-prep/prepareOverlayPass.ts`
  - `apps/vector-editor-web/src/editor/render-prep/prepareFrame.ts`
- Verified vector app compile remains green:
  `pnpm exec tsc -p apps/vector-editor-web/tsconfig.app.json --noEmit`.
- Integrated render-prep into runtime render entry:
  - `apps/vector-editor-web/src/editor/runtime/canvasAdapter.tsx` now builds
    prepared frames via `prepareRenderFrame(...)` and gates `engine.loadScene`
    by `preparedFrame.scene.dirty`.
- Added phase-3 baseline dirty/partial-update data flow:
  - `apps/vector-editor-web/src/editor/render-prep/types.ts` adds
    `PreparedDirtyState`.
  - `apps/vector-editor-web/src/editor/render-prep/prepareScenePass.ts`
    now accepts previous-frame context, performs shape-level scene diffs, and
    emits `instanceUpdates` for single-shape changes or full-range updates for
    structure changes.
  - `apps/vector-editor-web/src/editor/render-prep/prepareFrame.ts` now
    summarizes dirty state (`sceneInstanceIds`, `overlayDirty`, `pickingDirty`,
    `cameraDirty`) for downstream render policy.
- Extended dirty summary with `sceneStructureDirty` and wired runtime
  consumption in `apps/vector-editor-web/src/editor/runtime/canvasAdapter.tsx`:
  - structural scene changes still use `engine.loadScene(...)`
  - non-structural scene changes now use `engine.applyScenePatchBatch(...)`
    with upserted changed nodes only.
- Verified workspace-wide build-time types after integration:
  `pnpm typecheck`.

## 2026-04-15

- Added root documentation governance files:
  - `00_README.md`
  - `STATE.md`
  - `04_DECISIONS.md`
  - `05_CHANGELOG.md`
  - `06_TODO.md`
- Introduced canonical docs map at `docs/index.md`.
- Created new documentation domains:
  - `docs/product/*`
  - `docs/architecture/*`
  - `docs/engineering/*`
  - `docs/ai/*`
  - `docs/decisions/*`
- Renamed and relocated old docs:
  - `docs/00-Docs-Home.md` -> `docs/index.md`
  - `docs/architecture.md` -> `docs/architecture/overview.md`
  - `docs/runtime-engine-responsibility-split.md` -> `docs/architecture/layering.md`
  - `docs/runtime-mindmap-guide.md` -> `docs/architecture/runtime.md`
- Added ADR records for architecture boundary and documentation governance.
- Normalized `docs/task/plan-2.md` from mixed mega-plan into execution-plan scope.
- Normalized `docs/task/plan-1.md` from mixed mega-plan into execution-plan scope.
- Synced plan routing deltas into `STATE.md` and `06_TODO.md`.
- Added task-plan navigation entries in `docs/index.md`.
- Added workflow `Workflow E: Large Plan Normalization` in `docs/ai/workflows.md`.
- Started runtime decomposition development by extracting shape action dispatch
  from `useEditorRuntime.ts` into
  `apps/vector-editor-web/src/hooks/runtime/shapeActions.ts`.
- Migrated vector app UI dependency from workspace package to local app-owned
  source by vendoring `packages/ui` primitives into
  `apps/vector-editor-web/src/ui/kit/*` and switching imports to `@vector/ui`.
- Restructured vector app source layout to reduce top-level noise:
  - moved runtime-facing modules to `apps/vector-editor-web/src/editor/*`
  - moved shared constants/types/utilities to
    `apps/vector-editor-web/src/shared/*`
- Updated vector app build configuration (`tsconfig.app.json`, `vite.config.ts`,
  and `package.json`) to use local UI aliasing and local UI dependencies.
