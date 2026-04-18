# Changelog

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
