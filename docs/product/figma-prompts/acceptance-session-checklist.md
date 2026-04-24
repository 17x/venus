# Figma Manual Acceptance Session Checklist

## 1. Session metadata

- Date:
- Reviewer:
- Figma file:
- Figma page:
- Build/runtime context:
- Notes:

## 2. Status rubric

- planned: not reviewed yet
- in-progress: reviewed but unresolved mismatch exists
- verified: reviewed and matches runtime behavior
- done: verified + mapping docs synced + changelog/todo updated

## 3. Selection/transform workflow checklist

Reference prompt: `docs/product/figma-prompts/selection-transform-workflows.md`

| Item                                 | Expected behavior                                                      | Runtime anchor                                                             | Session status | Frame/link evidence | Notes |
| ------------------------------------ | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------- | ------------------- | ----- |
| Hover degraded in motion-heavy modes | Hover chrome is degraded in panning/zooming/dragging/resizing/rotating | `useEditorRuntimeDerivedState.ts` (`overlayInteractionDegraded`)           | planned        |                     |       |
| Path-edit whitelist behavior         | Path editing keeps full-fidelity overlay while global mode is degraded | `useEditorRuntimeDerivedState.ts` (`pathEditWhitelistActive`)              | planned        |                     |       |
| Degraded snap guide retention        | At most one snap guide per axis in degraded mode                       | `useEditorRuntimeDerivedState.ts` (`effectiveSnapGuides`)                  | planned        |                     |       |
| Axis relevance in degraded guides    | Kept guide per axis is relevance-prioritized by bounds                 | `useEditorRuntimeDerivedState.ts` (`axis-relevance`)                       | planned        |                     |       |
| Render phase mapping                 | `pan`/`zoom`/`drag` map to degraded overlay mode                       | `renderPolicy.ts` (`resolveRuntimeRenderPolicy`)                           | planned        |                     |       |
| Precision phase behavior             | `precision` keeps full quality and full overlay                        | `renderPolicy.ts` (`phase === 'precision'`)                                | planned        |                     |       |
| Hover hit throttling                 | Hover hit recompute respects time and distance budget                  | `useEditorRuntimeCanvasInteractions.ts`                                    | planned        |                     |       |
| Hover gating by editing mode         | Hover hit path is gated in active interaction modes                    | `useEditorRuntimeCanvasInteractions.ts`                                    | planned        |                     |       |
| Group vs deep-hit selector behavior  | Default group preference, modifier enables deep-hit path               | `bindEditorWorkerScope.ts` (`preferGroupSelection`)                        | planned        |                     |       |
| Transform preview path               | Drag/resize/rotate preview defers to overlay path                      | `useEditorRuntimeDerivedState.ts` (`shouldDeferTransformPreviewToOverlay`) | planned        |                     |       |

## 4. Context menu and shortcut checklist

Reference prompt: `docs/product/figma-prompts/context-shortcuts-matrix.md`

| Item                                   | Expected behavior                                                      | Runtime anchor                                      | Session status | Frame/link evidence | Notes |
| -------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------- | -------------- | ------------------- | ----- |
| Copy enablement by selection           | Disabled with no selection, enabled with single/multi selection        | `ContextMenu.tsx` (`noSelectedElement`)             | planned        |                     |       |
| Paste enablement by clipboard          | Depends on copied items availability                                   | `ContextMenu.tsx` (`copiedItems.length === 0`)      | planned        |                     |       |
| Group enablement                       | Enabled only when selected count >= 2                                  | `ContextMenu.tsx` (`canGroup`)                      | planned        |                     |       |
| Ungroup enablement                     | Enabled when selected count >= 1                                       | `ContextMenu.tsx` (`canUngroup`)                    | planned        |                     |       |
| Align submenu enablement               | Enabled only for multi-selection                                       | `ContextMenu.tsx` (`canAlign`)                      | planned        |                     |       |
| Layer submenu enablement               | Disabled with no selection                                             | `ContextMenu.tsx` (`disabled: noSelectedElement`)   | planned        |                     |       |
| Undo/redo history gating               | Enablement follows history prev/next availability                      | `ContextMenu.tsx` (`historyStatus`)                 | planned        |                     |       |
| Editor focus gating for shortcuts      | Global shortcuts only active when editor is focused                    | `useShortcut.tsx` (`shouldHandleEvent`)             | planned        |                     |       |
| Space temporary pan + restore          | Space switches to pan and restores previous tool on release/focus loss | `useShortcut.tsx` (`toggleTool`, focus-loss effect) | planned        |                     |       |
| Interactive target exclusion           | Shortcut capture skips interactive/input targets                       | `shortcut.ts` (`isInteractiveEventTarget`)          | planned        |                     |       |
| IME composition guard                  | Shortcut handler ignores composing/process events                      | `shortcut.ts` (`handleKey`)                         | planned        |                     |       |
| Tool and edit shortcut registry parity | Tool/edit key mappings match matrix labels                             | `actions.ts` (`TOOLS`, `EDIT`)                      | planned        |                     |       |

## 5. Exit criteria

- Every checklist row is `verified` or `done`.
- Any mismatch has a concrete follow-up owner and target file.
- `docs/product/figma-mapping.md` is updated with verification outcome.
- `06_TODO.md` progress note is updated with date and verification summary.
