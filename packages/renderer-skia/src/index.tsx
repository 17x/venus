import type { PointerEvent as ReactPointerEvent } from 'react'
import type { EditorDocument } from '@venus/editor-core'
import type { PointerState, SceneShapeSnapshot } from '@venus/shared-memory'

interface SkiaStageProps {
  document: EditorDocument
  shapes: SceneShapeSnapshot[]
  zoom: number
  onPointerMove?: (pointer: PointerState) => void
  onPointerDown?: (pointer: PointerState) => void
  onPointerLeave?: VoidFunction
}

function shapeStyles(shape: SceneShapeSnapshot) {
  const ring = shape.isSelected
    ? '0 0 0 3px rgba(14, 165, 233, 0.35)'
    : shape.isHovered
      ? '0 0 0 3px rgba(251, 191, 36, 0.28)'
      : 'none'

  if (shape.type === 'frame') {
    return {
      border: '1px solid rgba(15, 23, 42, 0.16)',
      background:
        'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(247,249,252,0.98))',
      borderRadius: '28px',
      boxShadow: `0 24px 80px rgba(15, 23, 42, 0.12), ${ring}`,
    }
  }

  if (shape.type === 'ellipse') {
    return {
      border: '1px solid rgba(20, 83, 45, 0.18)',
      background:
        'radial-gradient(circle at 35% 35%, rgba(250, 204, 21, 0.95), rgba(34, 197, 94, 0.75))',
      borderRadius: '999px',
      boxShadow: `0 18px 40px rgba(34, 197, 94, 0.25), ${ring}`,
    }
  }

  if (shape.type === 'rectangle') {
    return {
      border: '1px solid rgba(190, 24, 93, 0.16)',
      background:
        'linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(255, 228, 230, 0.98))',
      borderRadius: '20px',
      boxShadow: `0 18px 48px rgba(190, 24, 93, 0.12), ${ring}`,
    }
  }

  return {
    border: '1px solid rgba(15, 23, 42, 0.14)',
    background:
      'linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(226, 232, 240, 0.98))',
    borderRadius: '14px',
    boxShadow: `0 14px 32px rgba(15, 23, 42, 0.12), ${ring}`,
  }
}

export function SkiaStage({
  document,
  shapes,
  zoom,
  onPointerMove,
  onPointerDown,
  onPointerLeave,
}: SkiaStageProps) {
  const scale = zoom / 100

  const resolvePointer = (
    event: ReactPointerEvent<HTMLDivElement>,
    handler?: (pointer: PointerState) => void,
  ) => {
    if (!handler) {
      return
    }

    const rect = event.currentTarget.getBoundingClientRect()
    handler({
      x: (event.clientX - rect.left) / scale,
      y: (event.clientY - rect.top) / scale,
    })
  }

  return (
    <div className="stage-shell">
      <div className="stage-meta">
        <span>Renderer</span>
        <strong>SharedArrayBuffer-driven stage</strong>
      </div>

      <div className="stage-viewport">
        <div
          className="stage-canvas"
          style={{
            width: document.width,
            height: document.height,
            transform: `scale(${scale})`,
          }}
          onPointerMove={(event) => resolvePointer(event, onPointerMove)}
          onPointerDown={(event) => resolvePointer(event, onPointerDown)}
          onPointerLeave={onPointerLeave}
        >
          {shapes.map((shape) => (
            <div
              key={shape.id}
              className="stage-shape"
              style={{
                left: shape.x,
                top: shape.y,
                width: shape.width,
                height: shape.height,
                ...shapeStyles(shape),
              }}
            >
              <span>{shape.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
