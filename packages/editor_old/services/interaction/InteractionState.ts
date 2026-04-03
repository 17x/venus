import {OperationHandler} from '~/services/selection/type'
import {BoundingRect, Point, Rect, UID} from '~/type'
import {createWith} from '~/lib/lib'
import Editor from '~/main/editor'
import {ElementInstance} from '~/elements/type'
import {ToolName} from '~/services/tool/toolManager'
import {getBoundingRectFromBoundingRects} from '~/services/tool/resize/helper'
import {DEFAULT_STROKE} from '~/elements/defaultProps'
import {getSameRotationRectsBoundingRect} from '~/core/utils'
import ElementRectangle from '~/elements/rectangle/rectangle'
import {BezierPoint} from '~/elements/props'
import ElementEllipse from '~/elements/ellipse/ellipse'
import LineSegment from '~/elements/lines/lineSegment'
import ElementLineSegment from '~/elements/lines/lineSegment'
import dragging from '~/services/tool/selector/dragging/dragging'
import {generateSelectedBoundingElement} from '~/main/helper'

export type EditorManipulationType =
  | 'static'
  | 'waiting'
  | 'panning'
  | 'dragging'
  | 'resizing'
  | 'rotating'
  | 'zooming'
  | 'selecting'

export type Modifier = {
  button: number
  altKey: boolean
  shiftKey: boolean
  metaKey: boolean
  ctrlKey: boolean
  movementX: number
  movementY: number
}
export type PointHit = {
  x: number
  y: number
  type: 'center' | 'anchor' | 'path'
}

class InteractionState {
  editor: Editor
  state: EditorManipulationType = 'static'

  mouseStart: Point = {x: 0, y: 0}
  mouseCurrent: Point = {x: 0, y: 0}
  mouseDelta: Point = {x: 0, y: 0}

  mouseWorldStart: Point = {x: 0, y: 0}
  mouseWorldCurrent: Point = {x: 0, y: 0}
  mouseWorldDelta: Point = {x: 0, y: 0}
  mouseWorldMovement: Point = {x: 0, y: 0}

  _hoveredElement: ElementInstance | null = null
  // _hoveredResizeManipulator: ElementInstance | null = null
  // _hoveredRotateManipulator: ElementInstance | null = null

  _draggingElements: ElementInstance[] = []
  _resizingElements: ElementInstance[] = []
  _resizingData: { targetPoint?: { x: number, y: number }, placement: string } | null = null
  _rotateData: { startRotation: number, snappedRotation?: number, targetPoint: { x: number, y: number } } | null = null

  // transformHandles: ElementInstance[] = []
  // _controlPoints: ElementInstance[] = []

  // _hoveredHandle: ElementInstance | null = null
  // _movingHandle: ElementInstance | null = null

  // readonly operationHandlers: OperationHandler[] = []
  _pointDown = false
  _snapped = false
  _snappedPoint: PointHit | null = null
  _pointHit: PointHit | null = null
  selectedOutlineElement: ElementInstance | null = null
  // _creatingElementId: UID
  // _ele: Set<UID> = new Set()
  _selectingElements: Set<UID> = new Set()
  _deselection: UID | null = null
  // _resizingOperator: ResizeHandle | null = null
  _rotatingOperator: OperationHandler | null = null
  selectedShadow: Set<UID> = new Set()
  _ele: ElementInstance
  _modifier: Modifier = {
    button: -2,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    ctrlKey: false,
    movementX: 0,
    movementY: 0,
  }
  selectionBox: HTMLDivElement | null = null
  _lastTool: ToolName | null = null
  boxColor = '#435fb9'
  boxBgColor = 'rgba(31,180,255,0.1)'
  // toolMap: Map<string, ToolManager> = new Map()
  copyDeltaX = 10
  copyDeltaY = 10
  // initialized: boolean = false
  // currentToolName: string = 'selector'
  constructor(editor: Editor) {
    this.editor = editor
    this.selectionBox = createWith('div',/* 'selection-box', */  {
      display: 'none',
      pointerEvents: 'none',
      position: 'absolute',
      border: `1px dashed ${this.boxColor}`,
      // backgroundColor: `${this.boxBgColor}`,
      backgroundColor: 'transparent',
      zIndex: '10',
    })
    editor.container.appendChild(this.selectionBox)
  }

  hideSelectionBox(): void {
    this.selectionBox!.style.display = 'none'
  }

  updateSelectionBox({x, y, height, width}: Rect) {
    this.selectionBox!.style.transform = `translate(${x}px, ${y}px)`
    this.selectionBox!.style.width = width + 'px'
    this.selectionBox!.style.height = height + 'px'
    this.selectionBox!.style.display = 'block'
  }
/*

  generateTransformHandles() {
    const {world, action, toolManager, selection, mainHost} = this.editor
    const {scale, dpr, overlayCanvasContext: ctx} = world
    const ratio = scale * dpr
    const pointLen = 20 / ratio
    const idSet = selection.values
    const elements = mainHost.getElementsByIdSet(idSet)
    let rotations: number[] = []

    if (elements.length <= 1) {
      this.selectedOutlineElement = null
      if (elements.length === 0) return
    }

    this.transformHandles = []

    const rectsWithRotation: BoundingRect[] = []
    const rectsWithoutRotation: BoundingRect[] = []

    elements.forEach((ele: ElementInstance) => {
      const id = ele.id
      const clone = this.editor.mainHost.create(ele.toMinimalJSON())
      const centerPoint = ElementRectangle.create('handle-move-center', ele.cx, ele.cy, pointLen)

      centerPoint.stroke.enabled = false
      centerPoint.fill.enabled = true
      centerPoint.fill.color = 'orange'
      // centerPoint._relatedId = ele.id

      if (clone) {
        clone.fill.enabled = false
        clone.stroke.enabled = true
        clone.stroke.weight = 2 / scale
        clone.stroke.color = '#5491f8'
      }

      ele.onmouseenter = () => {
        if (this.editor.selection.has(ele.id)) return
        ctx.save()
        ctx.lineWidth = 1 / world.scale * world.dpr
        ctx.strokeStyle = '#5491f8'
        ctx.stroke(ele.path2D)
        ctx.restore()
      }

      ele.onmouseleave = () => {
        action.dispatch('rerender-overlay')
      }

      ele.onmousedown = () => {
        if (!selection.has(id)) {
          action.dispatch('selection-modify', {mode: 'replace', idSet: new Set([id])})
        }
        toolManager.subTool = dragging
        this._draggingElements = mainHost.getElementsByIdSet(selection.values)
      }

      this.transformHandles.push(centerPoint)

      rotations.push(ele.rotation)
      rectsWithRotation.push(ele.getBoundingRect())
      rectsWithoutRotation.push(ele.getBoundingRect(true))
    })

    // selectedOutlineElement
    const sameRotation = rotations.every(val => val === rotations[0])
    const applyRotation = sameRotation ? rotations[0] : 0
    let rect: { cx: number, cy: number, width: number, height: number }
    const specialLineSeg = idSet.size === 1 && elements[0].type === 'lineSegment'

    if (sameRotation) {
      rect = getMinimalBoundingRect(rectsWithoutRotation, applyRotation)
      if (specialLineSeg) {
        rect.width = 1
        rect.cx = elements[0].cx
      }
      this.transformHandles.push(...getManipulationBox(rect, applyRotation, ratio, specialLineSeg))
    } else {
      rect = getBoundingRectFromBoundingRects(rectsWithRotation)
      this.transformHandles.push(...getManipulationBox(rect, 0, ratio, specialLineSeg))
    }

    this.selectedOutlineElement = new ElementRectangle({
      id: 'selected-elements-outline',
      layer: 0,
      show: !specialLineSeg,
      type: 'rectangle',
      ...rect,
      rotation: applyRotation,
      stroke: {
        ...DEFAULT_STROKE,
        weight: 2 / scale,
        color: this.boxColor,
      },
    })
  }
*/
/*

  createPathPoints() {
    const {scale, dpr} = this.editor.world
    const ratio = scale * dpr
    const idSet = this.editor.selection.values
    const pointLen = 20 / ratio
    // const eles = this.editor.visible.values
    const pointElements: ElementInstance[] = []
    const elements = this.editor.mainHost.getElementsByIdSet(idSet)
    const resizeStrokeWidth = 2 / ratio

    elements.forEach(ele => {
      const points: BezierPoint[] = ele.getBezierPoints()

      points.forEach((point, index) => {
        const aPX = point.anchor.x
        const aPY = point.anchor.y
        const id = ele.id + '-anchor-' + index
        const anchorPoint = ElementRectangle.create(id, aPX, aPY, pointLen)
        let cp1: ElementEllipse | null
        let cp2: ElementEllipse | null
        let line1: ElementLineSegment | null
        let line2: ElementLineSegment | null

        anchorPoint.fill.enabled = true
        anchorPoint.fill.color = '#00ff00'
        anchorPoint.layer = 1
        anchorPoint.stroke.weight = resizeStrokeWidth

        anchorPoint.on('move', ({dx, dy}) => {
          ele.points[index].anchor.x += dx
          ele.points[index].anchor.y += dy

          line1 && line1.translate(dx, dy, false)
          line2 && line2.translate(dx, dy, false)
          cp1 && cp1.translate(dx, dy, false)
          cp2 && cp2.translate(dx, dy, false)

          // ele.updateOriginal()
          this.editor.action.dispatch('element-updated')
        })

        pointElements.push(anchorPoint)

        if (point.cp1) {
          const {x: cPX, y: cPY} = point.cp1

          cp1 = ElementEllipse.create(ele.id + '-cp1-' + index, cPX, cPY, pointLen)
          cp1.layer = 1
          cp1.fill.enabled = true
          cp1.fill.color = this.boxColor
          cp1.stroke.enabled = false

          line1 = LineSegment.create(ele.id + '-cp1-' + index, cPX, cPY, aPX, aPY)
          line1.layer = 1
          line1.stroke.color = this.boxColor
          line1.stroke.weight = 2 / ratio

          cp1.on('move', ({dx, dy}) => {
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
            this.editor.interaction.generateTransformHandles()

            this.editor.action.dispatch('element-updated')
            this.editor.action.dispatch('rerender-overlay')

          })

          pointElements.push(line1, cp1)
        }

        if (point.cp2) {
          const {x: cPX, y: cPY} = point.cp2
          cp2 = ElementEllipse.create(ele.id + '-cp2-' + index, cPX, cPY, pointLen)
          line2 = LineSegment.create(ele.id + '-cp2-' + index, cPX, cPY, aPX, aPY)

          cp2.layer = 2
          cp2.fill.enabled = true
          cp2.fill.color = this.boxColor
          cp2.stroke.enabled = false
          line2.layer = 1
          line2.stroke.color = this.boxColor
          line2.stroke.weight = 2 / ratio

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

            this.editor.interaction.generateTransformHandles()
            this.editor.action.dispatch('element-updated')
            this.editor.action.dispatch('rerender-overlay')
          })

          pointElements.push(line2, cp2)
        }
      })
    })

    // this.editor.interaction._controlPoints = pointElements
    this.editor.interaction._controlPoints = []
  }
*/

  destroy() {
    this.selectionBox?.remove()
    this.selectionBox = null!
  }
}

export default InteractionState