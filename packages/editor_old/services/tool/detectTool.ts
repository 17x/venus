import ToolManager from '~/services/tool/toolManager'
import {isPointNearStroke2} from '~/services/tool/helper'

function detectTool(this: ToolManager) {
  const {interaction, world, visible} = this
  const {baseCanvasContext: ctx, scale, dpr} = world
  const {x, y} = interaction.mouseCurrent
  const viewPoint = {
    x: x * dpr,
    y: y * dpr,
  }
  const elements = visible.values
  // const mElements = interaction.transformHandles.sort((a, b) => b.layer - a.layer)
  // const cElements = interaction._controlPoints.sort((a, b) => b.layer - a.layer)

  interaction._hoveredElement = null
  interaction._hoveredResizeManipulator = null
  interaction._hoveredRotateManipulator = null
  interaction._hoveredHandle = null

  for (let i = 0; i < cElements.length; i++) {
    const currMEle = cElements[i]
    const {path2D} = currMEle
    const inside = ctx.isPointInPath(path2D, viewPoint.x, viewPoint.y)

    if (inside) {
      interaction._hoveredHandle = currMEle
      break
    }
  }

  for (let i = 0; i < mElements.length; i++) {
    const currMEle = mElements[i]
    const {path2D, id} = currMEle
    // const f1 = ctx.isPointInStroke(path2D, viewPoint.x, viewPoint.y)
    // const f2 = ctx.isPointInPath(path2D, viewPoint.x, viewPoint.y)
    const inside = ctx.isPointInPath(path2D, viewPoint.x, viewPoint.y)
    if (inside) {
      // interaction._hoveredElement = elementManager.getElementById(currMEle._relatedId)
      // console.log(id)
      if (id.includes('resize')) {
        interaction._hoveredResizeManipulator = currMEle
      } else if (id.includes('rotate')) {
        interaction._hoveredRotateManipulator = currMEle
      } else if (id.includes('handle-move-center')) {

      }
      break
    }
  }

  for (let i = elements.length - 1; i >= 0; i--) {
    const ele = elements[i]
    const path = ele.path2D
    if (!ele.show || ele.opacity <= 0 || interaction._draggingElements.includes(ele)) continue

    const lineWidth = 1 * dpr / scale
    const isNearStroke = isPointNearStroke2(ctx, path, viewPoint, 2 * dpr / scale, lineWidth)
    const inside = ctx.isPointInPath(path, viewPoint.x, viewPoint.y)

    if (isNearStroke) {
      interaction._hoveredElement = ele
    } else if (inside) {
      // interaction._hoveredRotateManipulator = null

      if (ele.fill.enabled) {
        interaction._hoveredElement = ele
      }
    }
  }
}

export default detectTool