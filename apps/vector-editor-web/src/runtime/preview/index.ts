import type { RuntimeOverlayInstruction } from '../overlay/index.ts'

export type RuntimePreviewKind =
  | 'transform'
  | 'insertion'
  | 'path-edit'
  | 'boolean-result'
  | 'text-edit'

export type RuntimePreviewPhase = 'start' | 'update' | 'commit' | 'cancel'

export interface RuntimePreviewInstruction extends RuntimeOverlayInstruction {
  readonly previewKind: RuntimePreviewKind
  readonly phase: RuntimePreviewPhase
}

export interface RuntimePreviewBuildInput {
  readonly transformPreview?: {
    shapes: Array<{
      shapeId: string
      x: number
      y: number
      width: number
      height: number
    }>
  } | null
}

/**
 * Build runtime-owned preview instructions that can be rendered by engine.
 */
export function buildRuntimePreviewInstructions(input: RuntimePreviewBuildInput): RuntimePreviewInstruction[] {
  const preview = input.transformPreview
  if (!preview || preview.shapes.length === 0) {
    return []
  }

  const instructions: RuntimePreviewInstruction[] = []

  preview.shapes.forEach((shape, index) => {
    const minX = shape.x
    const minY = shape.y
    const maxX = shape.x + shape.width
    const maxY = shape.y + shape.height
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    instructions.push({
      id: `transform-preview-${shape.shapeId}-${index}`,
      layerId: 'preview.transform',
      primitive: 'polyline',
      points: [
        {x: minX, y: minY},
        {x: maxX, y: minY},
        {x: maxX, y: maxY},
        {x: minX, y: maxY},
        {x: minX, y: minY},
      ],
      style: {
        strokeColor: 'rgba(37, 99, 235, 0.95)',
        strokeWidth: 1,
        strokeDash: [6, 4],
        nonScalingStroke: true,
      },
      previewKind: 'transform',
      phase: 'update',
    })

    const handles = [
      {x: minX, y: minY},
      {x: maxX, y: minY},
      {x: maxX, y: maxY},
      {x: minX, y: maxY},
      {x: centerX, y: centerY},
    ]

    handles.forEach((handle, handleIndex) => {
      instructions.push({
        id: `transform-preview-handle-${shape.shapeId}-${index}-${handleIndex}`,
        layerId: 'preview.transform',
        primitive: 'handle',
        points: [handle],
        style: {
          strokeColor: '#2563eb',
          strokeWidth: 1,
          fillColor: '#ffffff',
          nonScalingStroke: true,
        },
        previewKind: 'transform',
        phase: 'update',
      })
    })
  })

  return instructions
}
