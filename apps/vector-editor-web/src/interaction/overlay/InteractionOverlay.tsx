import {useMemo} from 'react'
import type {CanvasRendererProps} from '@venus/canvas-base'
import type {EditorDocument} from '@venus/document-core'
import type {SceneShapeSnapshot} from '@venus/shared-memory'
import {buildSelectionHandles} from '../selection/handleManager.ts'
import {buildSelectionState} from '../selection/selectionManager.ts'
import type {InteractionBounds} from '../types.ts'

interface InteractionOverlayProps {
  document: EditorDocument
  shapes: SceneShapeSnapshot[]
  viewport: CanvasRendererProps['viewport']
  marqueeBounds?: InteractionBounds | null
  hideSelectionChrome?: boolean
}

export function InteractionOverlay({
  document,
  shapes,
  viewport,
  marqueeBounds = null,
  hideSelectionChrome = false,
}: InteractionOverlayProps) {
  const selection = useMemo(
    () => buildSelectionState(document, shapes),
    [document, shapes],
  )
  const handles = useMemo(
    () => buildSelectionHandles(selection, {
      rotateDegrees:
        selection.selectedIds.length === 1
          ? (document.shapes.find((shape) => shape.id === selection.selectedIds[0])?.rotation ?? 0)
          : 0,
    }),
    [document.shapes, selection],
  )
  const singleSelectedShape = useMemo(
    () => selection.selectedIds.length === 1
      ? document.shapes.find((shape) => shape.id === selection.selectedIds[0]) ?? null
      : null,
    [document.shapes, selection.selectedIds],
  )
  const hovered = useMemo(
    () => selection.hoverId ? document.shapes.find((shape) => shape.id === selection.hoverId) : null,
    [document.shapes, selection.hoverId],
  )

  const viewportTransform = `matrix(${viewport.matrix[0]}, ${viewport.matrix[3]}, ${viewport.matrix[1]}, ${viewport.matrix[4]}, ${viewport.matrix[2]}, ${viewport.matrix[5]})`

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: viewportTransform,
          transformOrigin: '0 0',
        }}
      >
        {hovered && !selection.selectedIds.includes(hovered.id) && (
          <div
            style={{
              position: 'absolute',
              left: Math.min(hovered.x, hovered.x + hovered.width),
              top: Math.min(hovered.y, hovered.y + hovered.height),
              width: Math.abs(hovered.width),
              height: Math.abs(hovered.height),
              border: '1px dashed rgba(14, 165, 233, 0.9)',
              boxSizing: 'border-box',
            }}
          />
        )}

        {selection.selectedBounds && !hideSelectionChrome && (
          <div
            style={{
              position: 'absolute',
              left: selection.selectedBounds.minX,
              top: selection.selectedBounds.minY,
              width: selection.selectedBounds.maxX - selection.selectedBounds.minX,
              height: selection.selectedBounds.maxY - selection.selectedBounds.minY,
              border: '1px solid #2563eb',
              boxSizing: 'border-box',
              // Keep single-selection chrome aligned with element-local rotation.
              transform:
                singleSelectedShape && (singleSelectedShape.rotation ?? 0) !== 0
                  ? `rotate(${singleSelectedShape.rotation ?? 0}deg)`
                  : undefined,
              transformOrigin: 'center',
            }}
          />
        )}

        {!hideSelectionChrome && handles.map((handle) => (
          <div
            key={handle.id}
            style={{
              position: 'absolute',
              left: handle.x - 4,
              top: handle.y - 4,
              width: 8,
              height: 8,
              borderRadius: handle.kind === 'rotate' ? '50%' : 2,
              background: '#ffffff',
              border: '1px solid #2563eb',
              boxSizing: 'border-box',
            }}
          />
        ))}

        {marqueeBounds && (
          <div
            style={{
              position: 'absolute',
              left: marqueeBounds.minX,
              top: marqueeBounds.minY,
              width: Math.max(1, marqueeBounds.maxX - marqueeBounds.minX),
              height: Math.max(1, marqueeBounds.maxY - marqueeBounds.minY),
              border: '1px dashed rgba(37, 99, 235, 0.95)',
              background: 'rgba(37, 99, 235, 0.12)',
              boxSizing: 'border-box',
            }}
          />
        )}
      </div>
    </div>
  )
}
