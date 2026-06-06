import {
  createPointerSelectorState,
  resolvePointerSelectorPointerUp,
  type SelectorEngine,
  type SelectorRect,
} from '@venus/editor-primitive'
import {resolveEngineAdaptiveHitTolerance} from '../../../runtime/engine-bridge/engine.ts'
import {
  handleCanvasPointerLeave,
  handleCanvasPointerUp,
} from '../../useEditorRuntime/pointerRelease.ts'
import {resolvePointerLifecycleTransition} from './pointerLifecycleState.ts'
import {filterRuntimeSelectionCandidateIds} from '../selectionFilterPolicy.ts'
import type {
  EditorRuntimeCanvasInteractionControllerOptions,
  EditorRuntimeCanvasInteractionControllerState,
} from './canvasInteractionController.types.ts'

/**
 * Creates pointer-up handler for canvas runtime interactions.
 */
export function createPointerUpHandler(
  options: EditorRuntimeCanvasInteractionControllerOptions,
  controllerState: EditorRuntimeCanvasInteractionControllerState,
) {
  return () => {
    const lifecycle = resolvePointerLifecycleTransition(
      controllerState.pointerLifecyclePhase,
      'input.pointer.up',
    )
    controllerState.pointerLifecyclePhase = lifecycle.next
    if (!lifecycle.accepted) {
      return
    }

    // Emit runtime pointer lifecycle events so non-React subscribers can observe input flow.
    options.interactionBridge.dispatch({
      type: 'input.pointer.up',
    })
    if (options.currentTool === 'selector' || options.currentTool === 'dselector') {
      // Resolve selector click/marquee selection on pointer-up through editor-primitive state machine.
      const pointerSelectorState = controllerState.pointerSelectorState
      const pointerWorld = pointerSelectorState.currentWorld ?? pointerSelectorState.startWorld
      if (pointerWorld) {
        const adaptiveHitTolerance = resolveEngineAdaptiveHitTolerance({
          viewportScale: options.canvasRuntime.viewport.scale,
          viewportWidth: options.canvasRuntime.viewport.viewportWidth,
          viewportHeight: options.canvasRuntime.viewport.viewportHeight,
        })
        const selectorEngine: SelectorEngine<string> = {
          selectPoint: (queryPoint, queryOptions) => {
            // Keep click hit tolerance locked to the same adaptive source as hover.
            const pointTolerance = Number.isFinite(adaptiveHitTolerance.worldPx)
              ? adaptiveHitTolerance.worldPx
              : Math.max(0.5, queryOptions.tolerancePx)
            // Resolve point hit candidates in engine so vector no longer owns click hit geometry logic.
            const pointPayload = options.canvasRuntime.requestEngineGeometry({
              nodes: options.interactionDocument.shapes,
              pointer: queryPoint,
              preferGroupSelection: options.currentTool === 'selector',
              // Keep click tolerance aligned with hover adaptive hit policy.
              tolerance: pointTolerance,
              clipTolerance: Math.max(0.5, pointTolerance * 0.25),
              allowFrameSelection: false,
              // The host is the outer selectable element; engine clip validation limits its hit area.
              excludeClipBoundImage: false,
              strictStrokeHitTest: false,
              outlineLevel: 'low',
            })
            const filteredPointIds = filterRuntimeSelectionCandidateIds({
              candidateIds: pointPayload.pointHitNodeIds,
              interactionDocument: options.interactionDocument,
            })
            options.recordInteractionDiagnostic?.({
              kind: 'hit-candidate',
              stage: 'pointer-up',
              candidateCount: filteredPointIds.length,
            })
            return filteredPointIds.slice(0, 1)
          },
          selectRect: (rect: SelectorRect, queryOptions) => {
            const selectorRect = {
              minX: rect.minX,
              minY: rect.minY,
              maxX: rect.maxX,
              maxY: rect.maxY,
            }

            // Resolve final marquee ids in engine so vector no longer owns contain/intersect geometry checks.
            const marqueePayload = options.canvasRuntime.requestEngineGeometry({
              nodes: options.interactionDocument.shapes,
              marqueeBounds: selectorRect,
              marqueeMode: queryOptions.mode,
              outlineLevel: 'low',
            })
            const filteredMarqueeIds = filterRuntimeSelectionCandidateIds({
              candidateIds: marqueePayload.marqueeResolvedNodeIds,
              interactionDocument: options.interactionDocument,
            })
            options.recordInteractionDiagnostic?.({
              kind: 'hit-candidate',
              stage: 'pointer-up',
              candidateCount: filteredMarqueeIds.length,
            })
            return filteredMarqueeIds
          },
        }

        const pointerSelectorUp = resolvePointerSelectorPointerUp(
          pointerSelectorState,
          {
            pointWorld: pointerWorld,
            selector: selectorEngine,
            modifiers: controllerState.pointerSelectorModifiers,
          },
        )
        controllerState.pointerSelectorState = pointerSelectorUp.state
        options.setSelectorOverlayItems(pointerSelectorUp.overlays)
        if (pointerSelectorUp.selection) {
          options.handleCommand({
            type: 'selection.set',
            shapeIds: pointerSelectorUp.selection.targetIds,
            mode: pointerSelectorUp.selection.mode,
          })
        }
      }
    }

    controllerState.pointerSelectorStartScreen = null
    controllerState.pointerSelectorModifiers = undefined
    handleCanvasPointerUp(options)
    options.setSelectorOverlayItems([])
  }
}

/**
 * Creates pointer-leave handler for canvas runtime interactions.
 */
export function createPointerLeaveHandler(
  options: EditorRuntimeCanvasInteractionControllerOptions,
  controllerState: EditorRuntimeCanvasInteractionControllerState,
) {
  return () => {
    const lifecycle = resolvePointerLifecycleTransition(
      controllerState.pointerLifecyclePhase,
      'input.pointer.leave',
    )
    controllerState.pointerLifecyclePhase = lifecycle.next
    if (!lifecycle.accepted) {
      return
    }

    // Emit runtime pointer lifecycle events so non-React subscribers can observe input flow.
    options.interactionBridge.dispatch({
      type: 'input.pointer.leave',
    })
    controllerState.pointerSelectorState = createPointerSelectorState()
    controllerState.pointerSelectorStartScreen = null
    controllerState.pointerSelectorModifiers = undefined
    options.setSelectorOverlayItems([])
    handleCanvasPointerLeave(options)
  }
}
