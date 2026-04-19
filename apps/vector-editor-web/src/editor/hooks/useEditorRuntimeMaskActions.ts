import {boundsOverlap, isClosedMaskShape} from './useEditorRuntime.helpers.ts'

export function createAutoMaskHandler(options: {
  add: (message: string, tone: 'info' | 'success' | 'warning' | 'error') => void
  canvasShapes: import('@venus/document-core').EditorDocument['shapes']
  handleCommand: (command: import('@vector/runtime/worker').EditorRuntimeCommand) => void
  selectedNode: import('@venus/document-core').DocumentNode | null
}) {
  return () => {
    if (!options.selectedNode || options.selectedNode.type === 'frame' || options.selectedNode.type === 'group') {
      options.add('Select an image or a closed shape to create a mask.', 'info')
      return
    }

    const otherShapes = options.canvasShapes.filter((shape) =>
      shape.id !== options.selectedNode?.id &&
      shape.type !== 'frame' &&
      shape.type !== 'group',
    )

    if (options.selectedNode.type === 'image') {
      const candidates = otherShapes.filter((shape) =>
        isClosedMaskShape(shape) && boundsOverlap(options.selectedNode!, shape),
      )

      if (candidates.length !== 1) {
        options.add(
          candidates.length === 0
            ? 'No single closed shape overlaps this image.'
            : 'Multiple closed shapes overlap this image. Narrow the target first.',
          'info',
        )
        return
      }

      options.handleCommand({
        type: 'shape.set-clip',
        shapeId: options.selectedNode.id,
        clipPathId: candidates[0].id,
        clipRule: 'nonzero',
      })
      options.add(`Masked with ${candidates[0].name}.`, 'info')
      return
    }

    if (isClosedMaskShape(options.selectedNode)) {
      const candidates = otherShapes.filter((shape) =>
        shape.type === 'image' && boundsOverlap(options.selectedNode!, shape),
      )

      if (candidates.length !== 1) {
        options.add(
          candidates.length === 0
            ? 'No single image overlaps this shape.'
            : 'Multiple images overlap this shape. Narrow the target first.',
          'info',
        )
        return
      }

      options.handleCommand({
        type: 'shape.set-clip',
        shapeId: candidates[0].id,
        clipPathId: options.selectedNode.id,
        clipRule: 'nonzero',
      })
      options.add(`Masked ${candidates[0].name} with ${options.selectedNode.name}.`, 'info')
      return
    }

    options.add('Only images and closed shapes can participate in masking.', 'info')
  }
}

export function createClearMaskHandler(options: {
  add: (message: string, tone: 'info' | 'success' | 'warning' | 'error') => void
  handleCommand: (command: import('@vector/runtime/worker').EditorRuntimeCommand) => void
  selectedNode: import('@venus/document-core').DocumentNode | null
}) {
  return () => {
    if (!options.selectedNode || options.selectedNode.type !== 'image') {
      options.add('Select an image to clear its mask.', 'info')
      return
    }

    if (!options.selectedNode.clipPathId) {
      options.add('This image does not have an active mask.', 'info')
      return
    }

    options.handleCommand({
      type: 'shape.set-clip',
      shapeId: options.selectedNode.id,
      clipPathId: undefined,
      clipRule: undefined,
    })
    options.add('Image mask cleared.', 'info')
  }
}