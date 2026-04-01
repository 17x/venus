import ElementImage from '~/elements/image/image'

function render(this: ElementImage, ctx: CanvasRenderingContext2D): void {
  let {cx, cy, asset, width, height, rotation, opacity} = this.toJSON()
  const {img} = asset
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
    // console.log(asset)
    ctx.drawImage(img, -width / 2, -height / 2, width, height)
    // ctx.drawImage()
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