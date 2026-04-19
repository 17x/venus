import type {ElementProps} from '@lite-u/editor/types'

export function applyElementModifyAction(options: {
  canvasShapes: import('@venus/document-core').EditorDocument['shapes']
  data: unknown[]
  handleCommand: (command: import('@vector/runtime/worker').EditorRuntimeCommand) => void
}) {
  options.data.forEach((rawPatch) => {
    const patch = rawPatch as {id: string; props?: Partial<ElementProps>}
    const shape = options.canvasShapes.find((item) => item.id === patch.id)

    if (!shape || !patch.props) {
      return
    }

    const nextX = typeof patch.props.x === 'number' ? patch.props.x : shape.x
    const nextY = typeof patch.props.y === 'number' ? patch.props.y : shape.y
    const nextWidth = typeof patch.props.width === 'number' ? patch.props.width : shape.width
    const nextHeight = typeof patch.props.height === 'number' ? patch.props.height : shape.height
    const nextRotation = typeof patch.props.rotation === 'number' ? patch.props.rotation : (shape.rotation ?? 0)
    const nextName = typeof patch.props.name === 'string' ? patch.props.name : shape.text ?? shape.name

    if (nextName !== (shape.text ?? shape.name)) {
      options.handleCommand({
        type: 'shape.rename',
        shapeId: shape.id,
        name: nextName,
        text: shape.type === 'text' ? nextName : shape.text,
      })
    }

    if (nextX !== shape.x || nextY !== shape.y) {
      options.handleCommand({
        type: 'shape.move',
        shapeId: shape.id,
        x: nextX,
        y: nextY,
      })
    }

    if (nextWidth !== shape.width || nextHeight !== shape.height) {
      options.handleCommand({
        type: 'shape.resize',
        shapeId: shape.id,
        width: nextWidth,
        height: nextHeight,
      })
    }

    if (nextRotation !== (shape.rotation ?? 0)) {
      options.handleCommand({
        type: 'shape.rotate',
        shapeId: shape.id,
        rotation: nextRotation,
      })
    }

    const stylePatch: {
      fill?: import('@venus/document-core').DocumentNode['fill']
      stroke?: import('@venus/document-core').DocumentNode['stroke']
      shadow?: import('@venus/document-core').DocumentNode['shadow']
      cornerRadius?: number
      cornerRadii?: import('@venus/document-core').DocumentNode['cornerRadii']
      ellipseStartAngle?: number
      ellipseEndAngle?: number
    } = {}

    if (Object.prototype.hasOwnProperty.call(patch.props, 'fill')) {
      const incoming = patch.props.fill
      stylePatch.fill = incoming && typeof incoming === 'object'
        ? {
            ...(shape.fill ?? {}),
            ...(incoming as Record<string, unknown>),
          }
        : undefined
    }

    if (Object.prototype.hasOwnProperty.call(patch.props, 'stroke')) {
      const incoming = patch.props.stroke
      stylePatch.stroke = incoming && typeof incoming === 'object'
        ? {
            ...(shape.stroke ?? {}),
            ...(incoming as Record<string, unknown>),
          }
        : undefined
    }

    if (Object.prototype.hasOwnProperty.call(patch.props, 'shadow')) {
      const incoming = patch.props.shadow
      stylePatch.shadow = incoming && typeof incoming === 'object'
        ? {
            ...(shape.shadow ?? {}),
            ...(incoming as Record<string, unknown>),
          }
        : undefined
    }

    if (typeof patch.props.cornerRadius === 'number') {
      stylePatch.cornerRadius = patch.props.cornerRadius
    }

    if (Object.prototype.hasOwnProperty.call(patch.props, 'cornerRadii')) {
      const incoming = patch.props.cornerRadii
      stylePatch.cornerRadii = incoming && typeof incoming === 'object'
        ? {
            ...(shape.cornerRadii ?? {}),
            ...(incoming as Record<string, unknown>),
          }
        : undefined
    }

    if (typeof patch.props.ellipseStartAngle === 'number') {
      stylePatch.ellipseStartAngle = patch.props.ellipseStartAngle
    }

    if (typeof patch.props.ellipseEndAngle === 'number') {
      stylePatch.ellipseEndAngle = patch.props.ellipseEndAngle
    }

    if (Object.keys(stylePatch).length > 0) {
      options.handleCommand({
        type: 'shape.patch',
        shapeId: shape.id,
        patch: stylePatch,
      })
    }
  })
}