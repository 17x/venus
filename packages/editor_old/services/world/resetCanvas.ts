export type TransformType = [
  horizontalScaling: number,
  verticalSkewing: number,
  horizontalSkewing: number,
  verticalScaling: number,
  horizontalTranslation: number,
  verticalTranslation: number
]

const resetCanvas = (ctx: CanvasRenderingContext2D, scale: number, offset: { x: number, y: number }, dpr: number,
) => {
  const transform: TransformType = [
    scale, 0, 0, scale, offset.x, offset.y,
  ]
  // ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.resetTransform()
  ctx.clearRect(
    0,
    0,
    ctx.canvas.width * dpr,
    ctx.canvas.height * dpr,
  )

  ctx.setTransform(...transform)
}

export default resetCanvas