# Figma Prompt Document: Venus Context Menu And Shortcuts Matrix

## 1. Purpose

Design a dedicated matrix page that validates context-menu actions and keyboard-shortcut availability across key editor states.

This page is for parity checking, not visual shell redesign.

## 2. Design goal

Create a compact, auditable matrix that makes action availability obvious.

The matrix should support:

- enabled/disabled state clarity
- shortcut discoverability
- selection-cardinality behavior differences
- mode-specific behavior differences

## 3. Matrix axes

Rows (actions):

- Copy
- Paste
- Duplicate
- Delete
- Group
- Ungroup
- Align (left/center/right/top/middle/bottom)
- Layer order (forward/backward/front/back)
- Undo
- Redo
- Tool switch shortcuts (selector, direct selector, path, text, pan, zoom)

Columns (state contexts):

1. No selection
2. Single selection
3. Multi-selection
4. Group selected
5. Path editing
6. Text editing
7. Panning/zooming/dragging

## 4. Required semantics

- Explicitly encode enabled, disabled, and hidden states.
- Show modifier behavior where selection semantics change.
- Keep labels aligned with runtime action ids.
- Include conflict notes for text-input focus versus global shortcuts.

## 5. Visual structure

- Use a table-first layout with concise chips/tags for state.
- Add a right-side notes panel for behavior exceptions.
- Keep dense but readable row height.
- Include legend for `enabled`, `disabled`, `requires modifier`, `mode-locked`.

## 6. Mapping anchors in code

- Context menu action wiring: `apps/vector-editor-web/src/components/contextMenu/ContextMenu.tsx`
- Shortcut hook: `apps/vector-editor-web/src/editor/hooks/useShortcut.tsx`
- Shortcut source registry: `apps/vector-editor-web/src/shared/constants/actions.ts`

## 7. Output expectation

Produce one matrix page that can be used directly as a parity checklist between Figma behavior design and runtime implementation.

## 8. Acceptance parity baseline (code-verified)

### Context menu state matrix

| Action        | No selection                         | Single selection     | Multi-selection      | Runtime rule anchor                                        |
| ------------- | ------------------------------------ | -------------------- | -------------------- | ---------------------------------------------------------- |
| Copy          | disabled                             | enabled              | enabled              | `ContextMenu.tsx` (`noSelectedElement`)                    |
| Paste         | depends on clipboard (`copiedItems`) | depends on clipboard | depends on clipboard | `ContextMenu.tsx` (`copiedItems.length === 0`)             |
| Duplicate     | disabled                             | enabled              | enabled              | `ContextMenu.tsx` (`noSelectedElement`)                    |
| Group         | disabled                             | disabled             | enabled              | `ContextMenu.tsx` (`canGroup = selectedIds.length >= 2`)   |
| Ungroup       | disabled                             | enabled              | enabled              | `ContextMenu.tsx` (`canUngroup = selectedIds.length >= 1`) |
| Align submenu | disabled                             | disabled             | enabled              | `ContextMenu.tsx` (`canAlign = selectedIds.length >= 2`)   |
| Delete        | disabled                             | enabled              | enabled              | `ContextMenu.tsx` (`noSelectedElement`)                    |
| Layer submenu | disabled                             | enabled              | enabled              | `ContextMenu.tsx` (`disabled: noSelectedElement`)          |
| Undo          | depends on history                   | depends on history   | depends on history   | `ContextMenu.tsx` (`historyStatus.hasPrev`)                |
| Redo          | depends on history                   | depends on history   | depends on history   | `ContextMenu.tsx` (`historyStatus.hasNext`)                |

### Shortcut behavior matrix

| Behavior                                                              | Runtime status | Evidence anchor                                        |
| --------------------------------------------------------------------- | -------------- | ------------------------------------------------------ |
| Global shortcuts only when editor is focused                          | Confirmed      | `useShortcut.tsx` (`shouldHandleEvent: () => focused`) |
| Temporary pan with `space` keydown, restore previous tool on keyup    | Confirmed      | `useShortcut.tsx` (`toggleTool`, `upMode`)             |
| Focus-loss fallback restores pre-space tool                           | Confirmed      | `useShortcut.tsx` (focus-loss effect)                  |
| Tool switch keys (`V`, `A`, `P`, `T`, `H`, `Z`, `Shift+Z`) registered | Confirmed      | `actions.ts` (`TOOLS`)                                 |
| Undo/redo/group/ungroup shortcuts registered                          | Confirmed      | `actions.ts` (`EDIT`)                                  |
| Interactive targets are excluded from global shortcut capture         | Confirmed      | `shortcut.ts` (`isInteractiveEventTarget`)             |
| IME composition is guarded (`event.isComposing`, `Process`)           | Confirmed      | `shortcut.ts` (`handleKey`)                            |

## 9. Remaining verification scope

- Validate Figma matrix visuals for `path editing`, `text editing`, and
  `panning/zooming/dragging` columns against runtime mode transitions in manual session playback.
- Confirm tooltip/help text parity for each shortcut action label in localized UI.
