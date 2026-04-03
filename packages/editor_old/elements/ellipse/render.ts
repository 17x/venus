import ElementEllipse from './ellipse'

function render(this: ElementEllipse, ctx: CanvasRenderingContext2D): void {
  let {cx, cy, r1, r2, show, rotation, opacity, fill, stroke} = this.toJSON()
  const {enabled: enabledFill, color: fillColor} = fill
  const {enabled: enabledStroke, color: strokeColor, weight, join, dashed} = stroke

  if (!show || opacity <= 0) return
  ctx.save()
  ctx.translate(cx, cy)

  if (rotation !== 0) {
    ctx.rotate(rotation! * Math.PI / 180)
  }

  // Apply fill style if enabled
  if (opacity > 0) {
    ctx.fillStyle = fillColor as string
    ctx.globalAlpha = opacity / 100
  }

  if (enabledStroke && weight > 0) {
    ctx.lineWidth = weight
    ctx.strokeStyle = strokeColor
    ctx.lineJoin = join
    ctx.beginPath()

    if (dashed) {
      ctx.setLineDash([3, 5])
    }

    ctx.beginPath()
    ctx.ellipse(0, 0, r1, r2, 0, 0, Math.PI * 2) // Ellipse for circle (can use same radius for both axes)

    ctx.closePath()
    ctx.stroke()
  }

  if (enabledFill) {
    ctx.fill()
  }

  ctx.restore()
}

export default render