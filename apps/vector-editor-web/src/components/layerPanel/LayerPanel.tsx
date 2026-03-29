import type { EditorDocument } from '@venus/editor-core'
import type { EditorRuntimeCommand } from '@venus/editor-worker'
import type { SceneShapeSnapshot } from '@venus/shared-memory'

interface LayerPanelProps {
  document: EditorDocument
  onCommand: (command: EditorRuntimeCommand) => void
  shapes: SceneShapeSnapshot[]
}

/**
 * Lightweight layer list that mirrors the old Vision panel behavior:
 * show document objects and let the user pick selection from the sidebar.
 */
export function LayerPanel({ document, onCommand, shapes }: LayerPanelProps) {
  const orderedShapes = [...shapes].reverse()

  return (
    <section className="panel-card vision-panel">
      <div className="vision-panel-header">
        <p className="eyebrow">Layer</p>
        <strong>{document.shapes.length}</strong>
      </div>

      <div className="vision-panel-scroll">
        {orderedShapes.map((shape) => (
          <button
            key={shape.id}
            type="button"
            className={shape.isSelected ? 'vision-list-item active' : 'vision-list-item'}
            onClick={() => onCommand({ type: 'selection.set', shapeId: shape.id })}
          >
            <span>{shape.name}</span>
            <small>{shape.type}</small>
          </button>
        ))}
      </div>
    </section>
  )
}
