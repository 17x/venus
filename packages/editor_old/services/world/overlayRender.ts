import World from '~/services/world/World'
import {PointHit} from '~/services/interaction/InteractionState'

function overlayRender(this: World) {
  if (this.editor.mainHost.size === 0) return
  const {overlayCanvasContext: ctx} = this
  const {_snappedPoint, selectedOutlineElement} = this.editor.interaction
  const {scale, dpr} = this.editor.world
  const ratio = scale * dpr
  const size = 20 / ratio
  const lineWidth = 2 / ratio
  const fontSize = 40 / ratio
  // const lineColor = '#5491f8'
  // const lineColor = '#435fb9'
  // const visibleElements = this.editor.visible.getVisibleSelectedElements

  if (_snappedPoint) {
    drawCrossWithLabel(ctx, _snappedPoint, size, '#ff0000', lineWidth, fontSize)
  }

  /*  visibleElements.forEach(visibleElement => {
      visibleElement.render(ctx)

      ctx.lineWidth = lineWidth
      // console.log(weight,strokeColor)
      ctx.strokeStyle = lineColor
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.stroke(visibleElement.path2D)
    })*/
  /*
    if (_hoveredElement) {
      const pointProps = _hoveredElement.center
      const eleStroke = this.editor.elementManager.create({
        ..._hoveredElement.toJSON(),
        stroke: {
          ...DEFAULT_STROKE,
          color: lineColor,
          weight: 4 / scale,
        },
        fill: {
          ...DEFAULT_FILL,
        },
      })
      const point = this.editor.elementManager.create({
        type: 'ellipse',
        r1: 2 / ratio,
        r2: 2 / ratio,
        cx: pointProps.x,
        cy: pointProps.y,
      } as OptionalIdentifiersProps)

      // console.log(lineWidth)
      // console.log(eleStroke)

      // ele.stroke.weight = 3 / ratio
      // ele.stroke.color = lineColor
      point.stroke.color = lineColor
      point.render(ctx)
      eleStroke.render(ctx)
    }
  */

  if (selectedOutlineElement) {
    // console.log(_outlineElement)
    selectedOutlineElement.render(ctx)
  }
/*
  this.editor.interaction.transformHandles.forEach((ele) => {
    // console.log(ele)
    ele.render(ctx)
  })*/

/*  this.editor.interaction._controlPoints.forEach((ele) => {
    ele.render(ctx)
  })*/

  /*if (this.viewport.enableCrossLine && this.viewport.drawCrossLine) {
    drawCrossLine({
      ctx,
      mousePoint: mouseMovePoint,
      scale,
      dpr,
      offset,
      worldRect: worldRect,
    })
  }*/
}

function drawCrossWithLabel(
  ctx: CanvasRenderingContext2D,
  {x, y, type}: PointHit,
  size = 6,
  color = 'red',
  lineWidth = 1,
  fontSize: number,
  // font = '12px sans-serif',
) {
  // const {x, y} = point
  const half = size / 2

  ctx.save()

  // Draw the cross
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth

  ctx.beginPath()
  ctx.moveTo(x - half, y - half)
  ctx.lineTo(x + half, y + half)

  ctx.moveTo(x + half, y - half)
  ctx.lineTo(x - half, y + half)

  ctx.stroke()

  // Draw the label
  ctx.fillStyle = color
  ctx.font = fontSize + 'px sans-serif'
  ctx.textBaseline = 'top'
  ctx.fillText(type, x + 5, y - 5)

  ctx.restore()
}

export default overlayRender