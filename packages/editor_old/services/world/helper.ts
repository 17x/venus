import {Point, Rect} from '~/type'
import World from '~/services/world/World'

// type FrameType = 'A4' | 'A4L' | 'photo1'

/*export const createFrame = (p: FrameType, id: UID): ElementInstance => {
  let width: number = 0
  let height: number = 0
  let x: number = 0
  let y: number = 0

  if (p === 'A4' || p === 'A4L') {
    const RATIO = 1.414142857

    if (p === 'A4L') {
      // A4 landscape
      height = 1000
      width = RATIO * height
    } else {
      width = 1000
      height = RATIO * width
    }
  } else if (p === 'photo1') {
    width = 35
    height = 55
  } else if (p === 'bigSquare') {
    width = 500
    height = 500
  }

  x = width / 2
  y = height / 2

  return new Rectangle({
    id,
    x,
    y,
    width,
    height,
    opacity: 100,
    lineWidth: 1,
    lineColor: '#000000',
    fillColor: '#fff',
    layer: -1,
  })
}*/

/*
* Fit a world coordinate based rect into pixel-based viewport
* which can set the rect middle of the viewport
* paddingScale can leave some space between the frame and the viewport boundary
* */
export const fitRectToViewport = (rect: Rect, viewport: Rect, paddingScale = 0.02): {
  scale: number
  offsetX: number
  offsetY: number
} => {
  const {width: viewWidth, height: viewHeight} = viewport
  const {width: rectWidth, height: rectHeight} = rect
  const scaleX = viewWidth / rectWidth
  const scaleY = viewHeight / rectHeight
  const scale = Math.min(scaleX, scaleY) - Math.min(scaleX, scaleY) * paddingScale
  const scaledRectWidth = rect.width * scale
  const scaledRectHeight = rect.height * scale
  const scaledRectX = rect.x * scale
  const scaledRectY = rect.y * scale

  const offsetX = (viewWidth - scaledRectWidth) / 2 - scaledRectX
  const offsetY = (viewHeight - scaledRectHeight) / 2 - scaledRectY

  return {
    scale,
    offsetX,
    offsetY,
  }
}

export function zoomAtPoint(
  this: World,
  atPoint: Point,
  newScale: number,
):
  {
    x: number;
    y: number;
  } {
  const {rect, viewportRect} = this.editor
  const {dpr, scale, offset} = this
  const pixelOffsetX = (atPoint.x - rect.width / 2) * dpr
  const pixelOffsetY = (atPoint.y - rect.height / 2) * dpr
  const centerAreaThresholdX = rect.width / 8
  const centerAreaThresholdY = rect.height / 8
  const scaleFactor = newScale / scale
  const idx = newScale < scale ? -0.2 : 0.2

  if (scaleFactor === 0) {
    return offset
  }

  const centerX = viewportRect.cx
  const centerY = viewportRect.cy
  let newOffsetX = centerX - (centerX - offset.x) * scaleFactor
  let newOffsetY = centerY - (centerY - offset.y) * scaleFactor

  if (Math.abs(pixelOffsetX) > centerAreaThresholdX) {
    newOffsetX = newOffsetX - pixelOffsetX * scaleFactor * idx
  }

  if (Math.abs(pixelOffsetY) > centerAreaThresholdY) {
    newOffsetY = newOffsetY - pixelOffsetY * scaleFactor * idx
  }

  return {
    x: newOffsetX,
    y: newOffsetY,
  }
}