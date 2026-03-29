import type { EditorRuntimeCommand } from '@venus/editor-worker'

interface StatusBarProps {
  onCommand: (command: EditorRuntimeCommand) => void
  onViewportFit: VoidFunction
  onViewportZoom: (nextScale: number) => void
  scale: number
  worldPoint: { x: number; y: number }
}

/**
 * App-level status bar inspired by the legacy Vision shell.
 *
 * Why:
 * - keep viewport controls near coordinate readout
 * - let the product shell own the exact UI while runtime stays generic
 */
export function StatusBar({
  onCommand,
  onViewportFit,
  onViewportZoom,
  scale,
  worldPoint,
}: StatusBarProps) {
  const zoomPercent = Math.round(scale * 100)

  return (
    <footer className="editor-status-bar">
      <div className="editor-status-cluster">
        <button
          type="button"
          className="status-action"
          onClick={() => onCommand({ type: 'viewport.zoomOut' })}
          aria-label="Zoom out"
        >
          -
        </button>

        <label className="zoom-control status-zoom-control">
          <span>Zoom</span>
          <input
            type="range"
            min="10"
            max="800"
            step="5"
            value={zoomPercent}
            onChange={(event) => onViewportZoom(Number(event.target.value) / 100)}
          />
          <strong>{zoomPercent}%</strong>
        </label>

        <button
          type="button"
          className="status-action"
          onClick={onViewportFit}
          aria-label="Fit canvas"
        >
          Fit
        </button>

        <button
          type="button"
          className="status-action"
          onClick={() => onCommand({ type: 'viewport.zoomIn' })}
          aria-label="Zoom in"
        >
          +
        </button>
      </div>

      <div className="editor-status-coordinates">
        {`dx:${worldPoint.x.toFixed(2)} dy:${worldPoint.y.toFixed(2)}`}
      </div>
    </footer>
  )
}
