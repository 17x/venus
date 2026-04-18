# Figma Mapping

## Purpose

Track page-to-PRD mapping and design coverage status.

## Mapping Table

| PRD Capability                       | Figma Page/Section                         | Status      | Notes                                                                                   |
| ------------------------------------ | ------------------------------------------ | ----------- | --------------------------------------------------------------------------------------- |
| Editor shell (toolbar/header/panels) | docs/product/figma-prompts/editor-shell.md | In Progress | Implemented A/B/C shell visual variants in vector app; Figma page mapping still pending |
| Selection + transform workflows      | TBD                                        | Missing     | Include rotate/scale/multi-select states                                                |
| Property panel controls              | TBD                                        | Missing     | Cover text/path/image style variations                                                  |
| Layer panel operations               | TBD                                        | Missing     | Include group and reorder behavior                                                      |
| Context menu + shortcuts             | TBD                                        | Missing     | Ensure parity with runtime commands                                                     |

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

## Update Rules

- Any accepted UI change should update this file in the same iteration.
- If a mapped page is removed or renamed, log the delta in `../../05_CHANGELOG.md`.
