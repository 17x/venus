import type { SceneShapeSnapshot } from '@venus/shared-memory'
import type { EditorRuntimeCommand } from '@venus/editor-worker'

interface PropPanelProps {
  onCommand: (command: EditorRuntimeCommand) => void
  selectedShape: SceneShapeSnapshot | null
}

/**
 * Simplified property panel that recreates the old right-panel editing flow
 * against the new shape command vocabulary.
 */
export default function PropPanel({ onCommand, selectedShape }: PropPanelProps) {
  if (!selectedShape) {
    return (
      <section className="panel-card vision-panel">
        <div className="vision-panel-header">
          <p className="eyebrow">Properties</p>
        </div>
        <div className="vision-empty-state">Select a shape to edit its frame.</div>
      </section>
    )
  }

  const commitMove = (key: 'x' | 'y', value: number) => {
    onCommand({
      type: 'shape.move',
      shapeId: selectedShape.id,
      x: key === 'x' ? value : selectedShape.x,
      y: key === 'y' ? value : selectedShape.y,
    })
  }

  const commitResize = (key: 'width' | 'height', value: number) => {
    onCommand({
      type: 'shape.resize',
      shapeId: selectedShape.id,
      width: key === 'width' ? value : selectedShape.width,
      height: key === 'height' ? value : selectedShape.height,
    })
  }

  return (
    <section className="panel-card vision-panel">
      <div className="vision-panel-header">
        <p className="eyebrow">Properties</p>
        <strong>{selectedShape.name}</strong>
      </div>

      <div className="vision-prop-grid">
        <label className="vision-prop-field">
          <span>X</span>
          <input
            type="number"
            value={Math.round(selectedShape.x)}
            onChange={(event) => commitMove('x', Number(event.target.value))}
          />
        </label>
        <label className="vision-prop-field">
          <span>Y</span>
          <input
            type="number"
            value={Math.round(selectedShape.y)}
            onChange={(event) => commitMove('y', Number(event.target.value))}
          />
        </label>
        <label className="vision-prop-field">
          <span>W</span>
          <input
            type="number"
            value={Math.round(selectedShape.width)}
            onChange={(event) => commitResize('width', Number(event.target.value))}
          />
        </label>
        <label className="vision-prop-field">
          <span>H</span>
          <input
            type="number"
            value={Math.round(selectedShape.height)}
            onChange={(event) => commitResize('height', Number(event.target.value))}
          />
        </label>
      </div>
    </section>
  )
}
