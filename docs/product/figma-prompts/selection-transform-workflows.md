# Figma Prompt Document: Venus Selection And Transform Workflows

## 1. Purpose

Design the end-to-end selection and transform interaction states for the Venus web vector editor.

This page focuses on behavior-rich editing moments, not static shell layout.

## 2. Design goal

Create production-ready interaction states that are:

- clear under overlap and dense scenes
- visually stable during drag/resize/rotate
- consistent with inspector and overlay feedback
- compact and low-noise

## 3. Required workflow states

Cover these states explicitly in one flow sequence:

1. No selection
2. Single selection
3. Multi-selection
4. Group selection vs deep selection (modifier key)
5. Move drag preview
6. Edge and corner resize
7. Rotation
8. Path edit point/segment selection
9. Mixed-value selection (inspector fields)
10. Post-transform settled state

## 4. Interaction constraints

- During panning/zooming/dragging, hover chrome should be degraded or suppressed.
- Active transform target should remain visually stable (no selection target flicker).
- Snap guides should remain coarse but readable in degraded mode.
- Path-edit chrome remains full-fidelity when path editing is active.

## 5. Visual outputs to include

Provide frame-by-frame variants for:

- selection box and handles
- hover highlight vs active transform chrome
- snap-guide states (full, degraded)
- group-level and deep-hit selection result
- mixed-value property indicators in inspector

## 6. Mapping anchors in code

- Selection/transform overlay: `apps/vector-editor-web/src/editor/interaction/overlay/InteractionOverlay.tsx`
- Runtime derived overlay gating: `apps/vector-editor-web/src/editor/hooks/useEditorRuntimeDerivedState.ts`
- Runtime editing mode and phase signals: `apps/vector-editor-web/src/editor/hooks/useEditorRuntime.ts`
- Runtime render policy/phase diagnostics: `apps/vector-editor-web/src/editor/runtime/renderPolicy.ts`

## 7. Output expectation

Design one dedicated page that shows transform-state continuity from pointer down to settled frame, including inspector mixed-value states and modifier-key selection behavior.

## 8. Acceptance parity baseline (code-verified)

| Workflow item                                                                                          | Runtime status | Evidence anchor                                                                                    |
| ------------------------------------------------------------------------------------------------------ | -------------- | -------------------------------------------------------------------------------------------------- |
| Hover chrome degraded during motion-heavy modes (`panning`/`zooming`/`dragging`/`resizing`/`rotating`) | Confirmed      | `useEditorRuntimeDerivedState.ts` (`overlayInteractionDegraded`)                                   |
| Path-edit whitelist keeps full-fidelity overlay during degraded global mode                            | Confirmed      | `useEditorRuntimeDerivedState.ts` (`hasPathEditActivity`, `pathEditWhitelistActive`)               |
| Degraded snap guides keep coarse guidance (max one per axis)                                           | Confirmed      | `useEditorRuntimeDerivedState.ts` (`effectiveSnapGuides`)                                          |
| Degraded snap guide keeps relevance-prioritized axis selection when bounds exist                       | Confirmed      | `useEditorRuntimeDerivedState.ts` (`axis-relevance`)                                               |
| Render phase policy maps `pan`/`zoom`/`drag` to degraded overlay mode                                  | Confirmed      | `renderPolicy.ts` (`resolveRuntimeRenderPolicy`)                                                   |
| `precision` phase keeps full quality and full overlay mode                                             | Confirmed      | `renderPolicy.ts` (`phase === 'precision'`)                                                        |
| Hover hit path is throttled by time+distance budget                                                    | Confirmed      | `useEditorRuntimeCanvasInteractions.ts` (`HOVER_HIT_MIN_INTERVAL_MS`, `HOVER_HIT_MIN_DISTANCE_PX`) |
| Hover hit recompute is gated for active interaction modes                                              | Confirmed      | `useEditorRuntimeCanvasInteractions.ts` (`HOVER_GATED_EDITING_MODES`)                              |
| Selector defaults to group-level preference; modifier keys enable deep-hit path                        | Confirmed      | `bindEditorWorkerScope.ts` (`preferGroupSelection`)                                                |
| Drag/resize/rotate preview defers to overlay path to reduce scene-dirty churn                          | Confirmed      | `useEditorRuntimeDerivedState.ts` (`shouldDeferTransformPreviewToOverlay`)                         |

## 9. Figma acceptance deliverables

- Provide one storyboard strip for each confirmed runtime state above.
- Include explicit labels for `degraded`, `precision`, and `settled` states.
- Include one overlap stress frame showing selector vs deep-hit modifier behavior.
- Include one mixed-selection inspector frame with clear mixed-value indicator style.
