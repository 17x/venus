import type { ToolName } from '@venus/document-core'
import type {
  RuntimeEditingMode,
  RuntimeEditingModeController,
  RuntimeToolRegistry,
} from '@venus/runtime'

function resolveEditingModeForTool(tool: ToolName): RuntimeEditingMode {
  switch (tool) {
    case 'selector':
      return 'selecting'
    case 'dselector':
      return 'directSelecting'
    case 'text':
      return 'textEditing'
    case 'panning':
      return 'panning'
    case 'zoomIn':
    case 'zoomOut':
      return 'zooming'
    case 'path':
      return 'drawingPath'
    case 'pencil':
      return 'drawingPencil'
    case 'rectangle':
    case 'ellipse':
    case 'lineSegment':
    case 'polygon':
    case 'star':
      return 'insertingShape'
    default:
      return 'idle'
  }
}

const DEFAULT_TOOLS: ToolName[] = [
  'selector',
  'dselector',
  'rectangle',
  'text',
  'ellipse',
  'panning',
  'lineSegment',
  'polygon',
  'star',
  'path',
  'pencil',
  'zoomIn',
  'zoomOut',
]

export function registerDefaultRuntimeToolHandlers(
  registry: RuntimeToolRegistry,
  modeController: RuntimeEditingModeController,
) {
  for (const tool of DEFAULT_TOOLS) {
    registry.register({
      id: tool,
      onEnter() {
        modeController.transition({
          to: resolveEditingModeForTool(tool),
          reason: `tool-enter:${tool}`,
        })
      },
      onExit() {
        modeController.transition({
          to: 'idle',
          reason: `tool-exit:${tool}`,
        })
      },
      getCursor() {
        if (tool === 'panning') return 'grab'
        if (tool === 'zoomIn') return 'zoom-in'
        if (tool === 'zoomOut') return 'zoom-out'
        if (tool === 'text') return 'text'
        return undefined
      },
    })
  }
}

export { resolveEditingModeForTool }
