/*
import Editor from '~/main/editor'
import {generateBoundingRectFromTwoPoints, throttle} from '~/core/utils'
import {BoundingRect} from '~/type'

export type ViewportManipulationType =
  | 'static'
  | 'waiting'
  | 'panning'
  | 'dragging'
  | 'resizing'
  | 'rotating'
  | 'zooming'
  | 'selecting'

class Viewport {
  editor: Editor
  // refs: ViewportDomRefType
  // mainCTX: CanvasRenderingContext2D
  // selectionCTX: CanvasRenderingContext2D
  // resizeObserver: ResizeObserver
  // eventsController: AbortController
  // initialized: boolean
  // dpr: number
  // spaceKeyDown: boolean
  // zooming: boolean
  // rect: BoundingRect
  // viewportRect: BoundingRect
  // worldRect: BoundingRect
  /!*offset: { x: number, y: number }
  scale: number*!/
  // enableCrossLine: boolean = false
  // drawCrossLineDefault: boolean = false
  // drawCrossLine: boolean = false

  constructor(editor: Editor) {
    // const id = editor.id
    this.editor = editor

    // this.selectionCTX = selectionCanvas.getContext('2d') as CanvasRenderingContext2D
    // this.mainCTX = mainCanvas.getContext('2d') as CanvasRenderingContext2D
    // this.eventsController = new AbortController()
 /!*   this.resizeObserver = new ResizeObserver(
      throttle(() => {
        // console.log('resize')
        this.editor.action.dispatch('world-resized')
      }, 200),
    )*!/
    // const mouseDownPoint = {x: 0, y: 0}
    // const mouseMovePoint = {x: 0, y: 0}
/!*    this.rect = generateBoundingRectFromTwoPoints(
      mouseDownPoint,
      mouseMovePoint,
    )*!/
/!*    this.viewportRect = generateBoundingRectFromTwoPoints(
      mouseDownPoint,
      mouseMovePoint,
    )*!/
/!*    this.worldRect = generateBoundingRectFromTwoPoints(
      mouseDownPoint,
      mouseMovePoint,
    )*!/
  }

  destroy() {
    // this.resizeObserver.disconnect()
    // this.refs.wrapper.style.width = '100%'
    // this.refs.wrapper.style.height = '100%'
    // this.refs.wrapper.remove()
  }
}

export default Viewport*/
