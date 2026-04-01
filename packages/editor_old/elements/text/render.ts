import Text from './text'

function render(this: Text, ctx: CanvasRenderingContext2D): void {
  let {content, cx, cy, width, rotation, opacity} = this.toJSON()
  // x = Math.round(x)
  // y = Math.round(y)
  // width = Math.round(width)
  // height = Math.round(height)
  // console.log(x, y, width, height)
  // const LocalX = x - width
  // const LocalY = y - height

  // Save current context state to avoid transformations affecting other drawings
  ctx.save()

  // Move context to the rectangle's center (Direct center point at x, y)
  ctx.translate(cx, cy)

  // Apply rotation if needed
  if (rotation! > 0) {
    ctx.rotate(rotation! * Math.PI / 180)
  }

  // Apply fill style if enabled
  if (opacity > 0) {
    ctx.globalAlpha = opacity / 100 // Set the opacity
  }

  // Fill if enabled
  if (opacity > 0) {
    // ctx.font = '20px monospace'
    // ctx.strokeStyle = 'blue'
    // ctx.textBaseline = 'middle'
    // ctx.textAlign = 'center'

    content.map(({text, fill, font, stroke}) => {
      ctx.font = `${font?.size}`
      ctx.fillStyle = fill?.color!

      ctx.fillText(text, 0, 0, width)
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = stroke.weight
      // ctx.strok

    })
    // ctx.closePath()
  }

  // Stroke if enabled

  /*   if (gradient) {
       // Implement gradient rendering (as needed)
     }*/

  // Restore the context to avoid affecting subsequent drawings
  ctx.restore()

}

export default render