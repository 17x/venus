# Figma Mapping

## Purpose

Track page-to-PRD mapping and design coverage status.

## Mapping Table

| PRD Capability                       | Figma Page/Section                                                                                                                                                                                     | Status      | Notes                                                                                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Editor shell (toolbar/header/panels) | docs/product/figma-prompts/editor-shell.md                                                                                                                                                             | In Progress | Implemented A/B/C shell variants plus semantic menu/tab/template picker alignment in vector app; continue section-by-section coverage sync  |
| Selection + transform workflows      | docs/product/figma-prompts/selection-transform-workflows.md + docs/product/figma-prompts/top-toolbar.md + docs/product/figma-prompts/left-tool-rail.md + docs/product/figma-prompts/right-inspector.md | In Progress | Dedicated transform-flow page added; next step is frame-by-frame state acceptance against runtime overlays and inspector mixed-value states |
| Property panel controls              | docs/product/figma-prompts/right-inspector.md                                                                                                                                                          | In Progress | Inspector structure mapped to properties/transform/appearance/text sections in vector app inspector components                              |
| Layer panel operations               | docs/product/figma-prompts/layer-history-panel.md                                                                                                                                                      | In Progress | Layer hierarchy/visibility/lock/history mapping now tied to right-side stacked panel contract                                               |
| Context menu + shortcuts             | docs/product/figma-prompts/context-shortcuts-matrix.md + docs/product/figma-prompts/editor-shell.md + docs/product/figma-prompts/top-toolbar.md                                                        | In Progress | Dedicated matrix page added; next step is state-by-state parity verification with runtime enable/disable behavior                           |
| Manual acceptance session runbook    | docs/product/figma-prompts/acceptance-session-checklist.md                                                                                                                                             | In Progress | Session checklist added; next step is completing row-by-row verification in active Figma file and promoting statuses to `verified`          |

## Active Figma File

- File: https://www.figma.com/design/BR1r0r0XjAwhQMB3DQigpY
- Page: Editor Shell Variants
- Variants:
  - Variant A: Clean neutral professional
  - Variant B: Dark tool-centric
  - Variant C: Refined restrained polish

## Variant To Code Mapping

### Variant A/B/C Shared Architecture

- Top menu bar -> apps/vector-editor-web/src/components/header/menu/Menu.tsx
- Top action toolbar -> apps/vector-editor-web/src/components/header/shortcutBar/ShortcutBar.tsx
- Header composition -> apps/vector-editor-web/src/components/header/Header.tsx
- Left tool rail -> apps/vector-editor-web/src/components/toolbar/Toolbar.tsx
- Center canvas workspace -> apps/vector-editor-web/src/editor/runtime/canvasAdapter.tsx
- Right inspector container -> apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx
- Properties section -> apps/vector-editor-web/src/components/propPanel/PropPanel.tsx
- Layer section -> apps/vector-editor-web/src/components/layerPanel/LayerPanel.tsx
- History section -> apps/vector-editor-web/src/components/historyPanel/HistoryPanel.tsx
- Bottom status/zoom -> apps/vector-editor-web/src/components/statusBar/StatusBar.tsx and apps/vector-editor-web/src/components/statusBar/ZoomSelect.tsx
- Shell theming tokens and variants -> apps/vector-editor-web/src/index.css

### Variant Style Token Mapping

- Variant A -> `.venus-editor` default token set in apps/vector-editor-web/src/index.css
- Variant B -> `.venus-editor[data-shell-variant='b']` in apps/vector-editor-web/src/index.css
- Variant C -> `.venus-editor[data-shell-variant='c']` in apps/vector-editor-web/src/index.css

### Recent Accepted Mapping Deltas

- Header/left/context menus are now consistently mapped to shadcn-style
  dropdown/submenu semantics with shared `venus-ui-menu-item` visuals.
- Template preset picker now follows split-pane mapping:
  options list (left) + preset details (right) + fixed bottom actions.
- Inspector text workflow mapping now treats text content edits as
  canvas-context behavior; right panel remains for structural/style properties.

## Coverage Snapshot (2026-04-24)

- Editor shell prompt coverage:
  - `docs/product/figma-prompts/editor-shell.md`
  - `apps/vector-editor-web/src/components/header/menu/Menu.tsx`
  - `apps/vector-editor-web/src/components/header/shortcutBar/ShortcutBar.tsx`
  - `apps/vector-editor-web/src/components/toolbar/Toolbar.tsx`
  - `apps/vector-editor-web/src/components/editorFrame/EditorFrameSidePanels.tsx`
  - `apps/vector-editor-web/src/components/statusBar/StatusBar.tsx`
- Inspector prompt coverage:
  - `docs/product/figma-prompts/right-inspector.md`
  - `apps/vector-editor-web/src/components/propPanel/PropPanel.tsx`
  - `apps/vector-editor-web/src/components/propPanel/PropPanelSections.tsx`
  - `apps/vector-editor-web/src/components/propPanel/PropPanelShapeProps.tsx`
- Layer and history prompt coverage:
  - `docs/product/figma-prompts/layer-history-panel.md`
  - `apps/vector-editor-web/src/components/layerPanel/LayerPanel.tsx`
  - `apps/vector-editor-web/src/components/historyPanel/HistoryPanel.tsx`
- Context/shortcut parity surfaces:
  - `docs/product/figma-prompts/context-shortcuts-matrix.md`
  - `apps/vector-editor-web/src/components/contextMenu/ContextMenu.tsx`
  - `apps/vector-editor-web/src/editor/hooks/useShortcut.tsx`
  - `apps/vector-editor-web/src/shared/constants/actions.ts`
- Selection/transform dedicated workflow prompt:
  - `docs/product/figma-prompts/selection-transform-workflows.md`
  - `apps/vector-editor-web/src/editor/interaction/overlay/InteractionOverlay.tsx`
  - `apps/vector-editor-web/src/editor/hooks/useEditorRuntimeDerivedState.ts`
  - `apps/vector-editor-web/src/editor/runtime/renderPolicy.ts`

## Coverage Gaps

- Dedicated pages and code-verified acceptance baseline tables are now in place
  for transform workflow and context-menu/shortcut matrix coverage.
- Manual design-session verification is now checklist-driven via
  `docs/product/figma-prompts/acceptance-session-checklist.md`.
- Remaining gap is executing the checklist in Figma and updating each row from
  `planned` to `verified`/`done` with frame evidence and mismatch notes.

## Update Rules

- Any accepted UI change should update this file in the same iteration.
- If a mapped page is removed or renamed, log the delta in `../../05_CHANGELOG.md`.
