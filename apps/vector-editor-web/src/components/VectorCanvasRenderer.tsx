import {Canvas2DRenderer, type CanvasRendererProps} from '@venus/runtime-react'
import {resolveNodeTransform, toResolvedNodeCssTransform} from '@venus/document-core'
import {InteractionOverlay} from '../interaction/index.ts'

export function VectorCanvasRenderer(props: CanvasRendererProps) {
  const imageIds = new Set(
    props.document.shapes
      .filter((shape) => shape.type === 'image')
      .map((shape) => shape.id),
  )
  const baseDocument = {
    ...props.document,
    shapes: props.document.shapes.filter((shape) => !imageIds.has(shape.id)),
  }
  const baseShapes = props.shapes.filter((shape) => !imageIds.has(shape.id))
  const viewportTransform = `matrix(${props.viewport.matrix[0]}, ${props.viewport.matrix[3]}, ${props.viewport.matrix[1]}, ${props.viewport.matrix[4]}, ${props.viewport.matrix[2]}, ${props.viewport.matrix[5]})`

  return (
    <div style={{position: 'relative', width: '100%', height: '100%'}}>
      <Canvas2DRenderer
        document={baseDocument}
        shapes={baseShapes}
        stats={props.stats}
        viewport={props.viewport}
        renderQuality={props.renderQuality}
      />

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
          {props.document.shapes
            .filter((shape) => shape.type === 'image')
            .map((shape) => {
              const transformState = resolveNodeTransform(shape)
              const imageStrokeColor = shape.stroke?.color ?? 'rgba(15, 23, 42, 0.18)'
              const imageStrokeWidth = Math.max(1, shape.stroke?.weight ?? 1)
              const imageStrokeEnabled = shape.stroke?.enabled ?? true
              const overlayTransform = toResolvedNodeCssTransform(transformState)

              if (shape.assetUrl) {
                return (
                  <img
                    key={shape.id}
                    src={shape.assetUrl}
                    alt={shape.name}
                    style={{
                      position: 'absolute',
                      left: transformState.bounds.minX,
                      top: transformState.bounds.minY,
                      width: transformState.bounds.width,
                      height: transformState.bounds.height,
                      objectFit: 'fill',
                      border: imageStrokeEnabled ? `${imageStrokeWidth}px solid ${imageStrokeColor}` : 'none',
                      background: '#fff',
                      boxSizing: 'border-box',
                      transform: overlayTransform,
                      transformOrigin: '0 0',
                    }}
                  />
                )
              }

              return (
                <div
                  key={shape.id}
                  style={{
                    position: 'absolute',
                    left: transformState.bounds.minX,
                    top: transformState.bounds.minY,
                    width: transformState.bounds.width,
                    height: transformState.bounds.height,
                    background: '#fdf2f8',
                    border: '2px dashed #ec4899',
                    color: '#9d174d',
                    padding: 12,
                    boxSizing: 'border-box',
                    fontSize: 14,
                    fontWeight: 700,
                    transform: overlayTransform,
                    transformOrigin: '0 0',
                  }}
                >
                  Image placeholder
                </div>
              )
            })}
        </div>
      </div>

      <InteractionOverlay
        document={props.document}
        shapes={props.shapes}
        viewport={props.viewport}
      />
    </div>
  )
}
