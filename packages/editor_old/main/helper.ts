import {BoundingRect, ElementInstance, UID} from '~/type'
import {getBoundingRectFromBoundingRects} from '~/services/tool/resize/helper'
import ElementRectangle from '~/elements/rectangle/rectangle'
import Rectangle from '~/elements/rectangle/rectangle'
import {getSameRotationRectsBoundingRect} from '~/core/utils'
import {DEFAULT_STROKE} from '~/elements/defaultProps'
import Editor from '~/main/editor'
import {rotatePointAroundPoint} from '~/core/geometry'
import Ellipse from '~/elements/ellipse/ellipse'
import ElementEllipse from '~/elements/ellipse/ellipse'
import {nid} from '~/index'
import {getRotateAngle} from '~/services/tool/selector/helper'
import {ResizeDirectionName} from '~/services/selection/type'
import {CanvasHostEvent} from '~/services/element/CanvasHost'
import LineSegment from '~/elements/lines/lineSegment'
import ElementLineSegment from '~/elements/lines/lineSegment'
import {BezierPoint} from '~/elements/props'

export function generateElementsDetectArea(this: Editor) {
  const boxColor = '#4f80ff'
  const {world, action, selection, mainHost, overlayHost} = this
  const {scale, dpr} = world
  const ratio = dpr / scale
  const idSet = selection.values
  const visibleElements = mainHost.visibleElements.sort((a, b) => a.layer - b.layer)
  const strokeWidth = 1 * ratio
  let maxLayer = mainHost.getMaxLayerIndex
  const handleTranslateMouseDown = (event: CanvasHostEvent, id: UID) => {
    const _shift = event.originalEvent.shiftKey

    if (!selection.has(id)) {

      action.dispatch('selection-modify', {mode: _shift ? 'add' : 'replace', idSet: new Set([id])})
    }
    // toolManager.subTool = dragging
    this.interaction._draggingElements = mainHost.getElementsByIdSet(selection.values)
  }

  visibleElements.forEach((ele) => {
    const id = ele.id
    const fillDetectArea = ele.clone()
    const strokeDetectArea = ele.clone()
    let strokeLine: ElementInstance
    const isSelected = idSet.has(id)
    let centerPoint: ElementEllipse | ElementRectangle | null = null

    fillDetectArea.id = 'invisible-clone-' + id
    // fillDetectArea.fill.enabled = true
    fillDetectArea.fill.color = 'transparent'
    fillDetectArea.stroke.enabled = false

    strokeDetectArea.id = 'stroke-detect-area-' + id
    strokeDetectArea.fill.enabled = false
    strokeDetectArea.stroke.enabled = true
    strokeDetectArea.stroke.color = 'transparent'
    strokeDetectArea.stroke.weight = 10 * ratio
    // strokeDetectArea.stroke.weight = 1

    strokeLine = strokeDetectArea.clone()
    strokeLine.id = 'stroke-line-clone-' + id
    strokeLine.stroke.weight = strokeWidth

    // fillDetectArea.onmousedown = (e) => handleTranslateMouseDown(e, id)
    // strokeLine.onmousedown = (e) => handleTranslateMouseDown(e, id)
    strokeLine.onmousedown = fillDetectArea.onmousedown = strokeDetectArea.onmousedown = (e) => handleTranslateMouseDown(e, id)
    overlayHost.append(fillDetectArea, strokeDetectArea, strokeLine)

    if (isSelected) {
      strokeDetectArea.layer = maxLayer + 1
      strokeLine.layer = maxLayer + 2
      strokeLine.stroke.color = boxColor
    } else {
      // strokeDetectArea.layer += 1
      // strokeLine.layer += 2
      strokeLine.stroke.color = 'transparent'

      fillDetectArea.onmouseenter = strokeDetectArea.onmouseenter = strokeLine.onmouseenter = () => {
        // strokeDetectArea.stroke.color = boxColor
        strokeLine.stroke.color = boxColor
        if (centerPoint) {
          centerPoint.fill.color = boxColor
        }
        action.dispatch('rerender-overlay')
      }

      fillDetectArea.onmouseleave = strokeDetectArea.onmouseleave = strokeLine.onmouseleave = () => {
        strokeLine.stroke.color = 'transparent'
        if (centerPoint) {
          centerPoint.fill.color = 'transparent'
        }
        action.dispatch('rerender-overlay')
      }
    }

    // const renderCenterPoint =  ele.type !== 'path1'
    const renderCenterPoint = true
    // centerPoint
    if (renderCenterPoint) {
      const pointLen = idSet.size === 1 ? 3 * ratio : 6 * ratio

      centerPoint = idSet.size === 1
        ? ElementEllipse.create(nid(), ele.cx, ele.cy, pointLen)
        : ElementRectangle.create(nid(), ele.cx, ele.cy, pointLen)

      if (isSelected) {
        centerPoint.layer = maxLayer + 1
      }
      centerPoint.stroke.enabled = false
      centerPoint.fill.enabled = true
      centerPoint.fill.color = isSelected ? boxColor : 'transparent'
      overlayHost.append(centerPoint)

      centerPoint.onmousedown = (e) => handleTranslateMouseDown(e, id)

      if (!isSelected) {
        centerPoint.onmouseenter = () => {
          if (centerPoint) {centerPoint.fill.color = 'blue'}
          strokeLine.stroke.color = boxColor
          this.action.dispatch('rerender-overlay')
        }
        centerPoint.onmouseleave = () => {
          if (centerPoint) {centerPoint.fill.color = 'transparent'}
          strokeLine.stroke.color = 'transparent'
          this.action.dispatch('rerender-overlay')
        }
      }
    }
  })
}

export function generateSelectedBoundingElement(this: Editor): ElementRectangle {
  const rectsWithRotation: BoundingRect[] = []
  const rectsWithoutRotation: BoundingRect[] = []
  let rotations: number[] = []
  const boxColor = '#4f80ff'
  const {world, selection, mainHost, overlayHost} = this
  const {scale, dpr} = world
  const ratio = dpr / scale
  const idSet = selection.values
  const selectedElements = mainHost.getElementsByIdSet(idSet).sort((a, b) => a.layer - b.layer)
  let maxLayer = mainHost.getMaxLayerIndex

  selectedElements.forEach((ele: ElementInstance) => {
    rotations.push(ele.rotation)
    rectsWithRotation.push(ele.getBoundingRect())
    rectsWithoutRotation.push(ele.getBoundingRect(true))
  })

  const sameRotation = rotations.every(val => val === rotations[0])
  let applyRotation = sameRotation ? rotations[0] : 0
  let rect: { cx: number, cy: number, width: number, height: number }
  const specialLineSeg = idSet.size === 1 && selectedElements[0].type === 'lineSegment'

  if (sameRotation) {
    rect = getSameRotationRectsBoundingRect(rectsWithoutRotation, applyRotation)
    if (specialLineSeg) {
      rect.width = 1
      rect.cx = selectedElements[0].cx
    }
  } else {
    rect = getBoundingRectFromBoundingRects(rectsWithRotation)
    applyRotation = 0
    console.log('rect',rect)
  }

  const selectedOutlineElement = new ElementRectangle({
    id: 'selected-elements-outline',
    layer: maxLayer,
    show: !specialLineSeg,
    type: 'rectangle',
    ...rect,
    rotation: applyRotation,
    stroke: {
      ...DEFAULT_STROKE,
      weight: 1 * ratio,
      color: boxColor,
    },
  })

  overlayHost.append(selectedOutlineElement)

  return selectedOutlineElement
}

export function generateTransformHandles(this: Editor, ele: ElementRectangle, specialLineSeg = false) {
  const {world} = this
  const boxColor = '#4f80ff'
  const {scale, dpr} = world
  const ratio = dpr / scale
  const result: ElementInstance[] = []
  const {cx, cy, width, height, rotation, layer} = ele
  const resizeLen = 8 * ratio
  const resizeStrokeWidth = 1 * ratio
  const rotateRadius = 16 * ratio
  const arr: { name: ResizeDirectionName, dx: number, dy: number }[] = [
    {name: 'tl', dx: -0.5, dy: -0.5},
    {name: 't', dx: 0.0, dy: -0.5},
    {name: 'tr', dx: 0.5, dy: -0.5},
    {name: 'r', dx: 0.5, dy: 0},
    {name: 'br', dx: 0.5, dy: 0.5},
    {name: 'b', dx: 0, dy: 0.5},
    {name: 'bl', dx: -0.5, dy: 0.5},
    {name: 'l', dx: -0.5, dy: 0},
  ]

  const handleRotateMouseEnter = () => {
    const mouseCurrentRotation = getRotateAngle({x: cx, y: cy}, this.interaction.mouseWorldCurrent)

    this.cursor.set('rotate')
    this.cursor.rotate(mouseCurrentRotation)
  }

  const handleRotateMouseLeave = () => {
    this.cursor.set(this.toolManager.tool.cursor)
    // this.action.dispatch('rerender-overlay')
  }

  const handleRotateMouseDown = () => {
    this.interaction._rotateData = {startRotation: rotation, targetPoint: {x: cx, y: cy}}
    const mouseCurrentRotation = getRotateAngle({x: cx, y: cy}, this.interaction.mouseWorldCurrent)

    this.cursor.rotate(mouseCurrentRotation)
  }

  const handleResizeMouseEnter = () => {
    const cursors: CSSStyleDeclaration['cursor'][] = [
      'ew-resize',
      'nwse-resize',
      'ns-resize',
      'nesw-resize',
      'ew-resize',
      'nwse-resize',
      'ns-resize',
      'nesw-resize',
    ]

    const mouseCurrentRotation = getRotateAngle({x: cx, y: cy}, this.interaction.mouseWorldCurrent)
    const index = Math.round(mouseCurrentRotation / 45) % 8
    this.cursor.set(cursors[index])
  }

  const handleResizeMouseLeave = () => {
    this.cursor.set('default')
  }

  const handleResizeMouseDown = (placement: ResizeDirectionName) => {
    this.cursor.set('resize')

    this.interaction._resizingData = {placement}
  }

  arr.map(({dx, dy, name}) => {
    if (specialLineSeg && name !== 't' && name !== 'b') return

    const {x, y} = rotatePointAroundPoint(cx + dx * width, cy + dy * height, cx, cy, rotation)
    const resizeEle = Rectangle.create('handle-resize-' + name, x, y, resizeLen)
    const rotateEle = Ellipse.create('handle-rotate-' + name, x, y, rotateRadius)

    resizeEle.rotation = rotation
    resizeEle.layer = layer + 4
    resizeEle.fill.enabled = true
    resizeEle.fill.color = '#ffffff'
    resizeEle.stroke.weight = resizeStrokeWidth
    resizeEle.stroke.color = boxColor
    resizeEle.updatePath2D()
    resizeEle.updateBoundingRect()

    rotateEle.layer = layer + 3
    rotateEle.rotation = rotation
    rotateEle.stroke.enabled = false
    rotateEle.stroke.weight = 0
    rotateEle.fill.enabled = true
    rotateEle.fill.color = 'transparent'

    // Set rotateEle arc angles based on position (degrees, will convert to radians)
    const angleMap: Record<ResizeDirectionName, number[]> = {
      't': [180, 360],
      'tr': [180, 90],
      'r': [270, 90],
      'br': [270, 180],
      'b': [360, 180],
      'bl': [0, 270],
      'l': [90, 270],
      'tl': [90, 360],
    }

    if (angleMap[name]) {
      const [startDeg, endDeg] = angleMap[name]
      rotateEle.startAngle = startDeg
      rotateEle.endAngle = endDeg
      rotateEle.updatePath2D()
      rotateEle.updateBoundingRect()
    }

    resizeEle.onmouseenter = handleResizeMouseEnter
    resizeEle.onmouseleave = handleResizeMouseLeave
    resizeEle.onmousedown = () => handleResizeMouseDown(name)
    rotateEle.onmouseenter = handleRotateMouseEnter
    rotateEle.onmouseleave = handleRotateMouseLeave
    rotateEle.onmousedown = handleRotateMouseDown

    this.overlayHost.append(rotateEle, resizeEle)
  })

  return result
}

export function generateAnchorAndPath(this: Editor) {
  const {mainHost, overlayHost,interaction} = this
  const {scale, dpr} = this.world
  const ratio = dpr / scale
  const idSet = this.selection.values
  const pointLen = 5 * ratio
  // const eles = this.visible.values
  const boxColor = '#4f80ff'
   const elements = this.mainHost.getElementsByIdSet(idSet)
  const anchorStrokeWidth = 1 * ratio
  let maxLayer = mainHost.getMaxLayerIndex

  elements.forEach(ele => {
    if (!ele.getBezierPoints) return

    const points: BezierPoint[] = ele.getBezierPoints()
    console.log(points)

    points.forEach((point, index) => {
      const aPX = point.anchor.x
      const aPY = point.anchor.y

      const anchorPoint = ElementRectangle.create(point.id, aPX, aPY, pointLen)
      const anchorPointDetect = anchorPoint.clone()
      let cp1: ElementEllipse | null
      let cp2: ElementEllipse | null
      let line1: ElementLineSegment | null
      let line2: ElementLineSegment | null

      anchorPoint.fill.enabled = true
      anchorPoint.fill.color = '#00ff00'
      anchorPoint.layer = maxLayer + 5
      anchorPoint.stroke.weight = anchorStrokeWidth

      anchorPointDetect.id = point.id + 'detect'
      anchorPointDetect.layer = maxLayer + 6
      anchorPointDetect.fill.enabled = true
      anchorPointDetect.fill.color = '#ff0000'
      anchorPointDetect.stroke.weight = anchorStrokeWidth
      anchorPointDetect.width = pointLen * 10
      anchorPointDetect.height = pointLen * 10

      anchorPoint.onmouseenter = () => {
        console.log(990)
      }
      anchorPoint.onmouseleave = () => {
        console.log(991)
      }
      anchorPoint.onmousedown = () => {
        console.log(998)
        interaction._movingHandle
      }
      /*
            anchorPoint.on('move', ({dx, dy}) => {
              ele.points[index].anchor.x += dx
              ele.points[index].anchor.y += dy

              line1 && line1.translate(dx, dy, false)
              line2 && line2.translate(dx, dy, false)
              cp1 && cp1.translate(dx, dy, false)
              cp2 && cp2.translate(dx, dy, false)

              // ele.updateOriginal()
              this.action.dispatch('element-updated')
            })*/

      overlayHost.append(anchorPoint,anchorPointDetect)
      // pointElements.push(anchorPoint)

      if (point.cp1) {
        const {x: cPX, y: cPY} = point.cp1

        cp1 = ElementEllipse.create(point.id + '-cp1', cPX, cPY, pointLen)
        cp1.layer = maxLayer + 1
        cp1.fill.enabled = true
        cp1.fill.color = boxColor
        cp1.stroke.enabled = false

        line1 = LineSegment.create(point.id + '-cp1-line', cPX, cPY, aPX, aPY)
        line1.layer = maxLayer + 2
        line1.stroke.color = boxColor
        line1.stroke.weight = 1 * ratio

        /*   cp1.on('move', ({dx, dy}) => {
             ele.points[index].cp1.x += dx
             ele.points[index].cp1.y += dy

             if (cp2) {
               cp2.cx = ele.points[index].cp2.x = ele.points[index].anchor.x * 2 - ele.points[index].cp1.x
               cp2.cy = ele.points[index].cp2.y = ele.points[index].anchor.y * 2 - ele.points[index].cp1.y
               cp2.updatePath2D()
             }

             if (line1) {
               line1.start.x += dx
               line1.start.y += dy
               line1.updatePath2D()
             }

             ele.updatePath2D()
             this.interaction.generateTransformHandles()

             this.action.dispatch('element-updated')
             this.action.dispatch('rerender-overlay')

           })
   */
        overlayHost.append(line1, cp1)

        // pointElements.push(line1, cp1)
      }

      if (point.cp2) {
        const {x: cPX, y: cPY} = point.cp2
        cp2 = ElementEllipse.create(point.id + '-cp2', cPX, cPY, pointLen)
        line2 = LineSegment.create(point.id + '-line-cp2', cPX, cPY, aPX, aPY)

        cp2.layer = maxLayer + 2
        cp2.fill.enabled = true
        cp2.fill.color = boxColor
        cp2.stroke.enabled = false
        line2.layer = 1
        line2.stroke.color = boxColor
        line2.stroke.weight = 1 * ratio

        cp2.on('move', ({dx, dy}) => {
          ele.points[index].cp2.x += dx
          ele.points[index].cp2.y += dy

          if (cp1) {
            cp1.cx = ele.points[index].cp1.x = ele.points[index].anchor.x * 2 - ele.points[index].cp1.x
            cp1.cy = ele.points[index].cp1.y = ele.points[index].anchor.y * 2 - ele.points[index].cp1.y
            cp1.updatePath2D()
          }

          if (line2) {
            line2.start.x += dx
            line2.start.y += dy
            line2.updatePath2D()
          }

          ele.updatePath2D()

          this.interaction.generateTransformHandles()
          this.action.dispatch('element-updated')
          this.action.dispatch('rerender-overlay')
        })

        overlayHost.append(line2, cp2)
      }


    })
  })

  // this.editor.interaction._controlPoints = pointElements
  this.interaction._controlPoints = []
}
