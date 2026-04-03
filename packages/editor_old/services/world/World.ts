import nid from '~/core/nid'
import ElementRectangle, {RectangleProps} from '~/elements/rectangle/rectangle'
import Editor from '~/main/editor'
import {BoundingRect, Point} from '~/type'
import {generateBoundingRectFromTwoPoints} from '~/core/utils'
import {createWith, screenToWorld, worldToScreen} from '~/lib/lib'
import {zoomAtPoint} from '~/services/world/helper'
import overlayRender from '~/services/world/overlayRender'
import {DEFAULT_STROKE} from '~/elements/defaultProps'

const STYLE = {
  position: 'absolute',
  left: '0',
  top: '0',
  width: '100%',
  height: '100%',
  pointerEvents: 'none',
}

class World {
  editor: Editor
  // baseCanvas: HTMLCanvasElement
  // baseCanvasContext: CanvasRenderingContext2D
  // overlayCanvas: HTMLCanvasElement
  // overlayCanvasContext: CanvasRenderingContext2D
  creationCanvas: HTMLCanvasElement
  creationCanvasContext: CanvasRenderingContext2D
  scale: number
  offset: { x: number, y: number }
  worldRect: BoundingRect
  // drawCrossLineDefault: boolean = false
  // drawCrossLine: boolean = false
  dpr: number

  constructor(editor: Editor) {
    this.editor = editor
    // this.baseCanvas = createWith('canvas', 'main-canvas',  {...STYLE})
    // this.overlayCanvas = createWith('canvas', 'overlay-canvas',  {...STYLE})
    this.creationCanvas = createWith('canvas', /*'creation-canvas', */  {...STYLE})
    this.creationCanvasContext = this.creationCanvas.getContext('2d') as CanvasRenderingContext2D
    // this.baseCanvasContext = this.baseCanvas.getContext('2d') as CanvasRenderingContext2D
    // this.overlayCanvasContext = this.overlayCanvas.getContext('2d') as CanvasRenderingContext2D
    // this.selectionBox = createWith('div', 'editor-selection-box', editor.id)
    // this.baseCanvas.setAttribute('id', 'main-canvas')
    this.scale = 1
    this.offset = {x: 0, y: 0}
    this.worldRect = generateBoundingRectFromTwoPoints(
      this.offset,
      this.offset,
    )
    this.dpr = editor.config.dpr

    // this.selectionBox.style.pointerEvents = 'none'
    this.editor.container.append(/*this.baseCanvas, this.overlayCanvas, */this.creationCanvas)
  }

  updateWorldRect() {
    const {width, height} = this.editor.viewportRect
    const {dpr} = this
    const p1 = this.getWorldPointByViewportPoint(0, 0)
    const p2 = this.getWorldPointByViewportPoint(width / dpr, height / dpr)

    this.worldRect = generateBoundingRectFromTwoPoints(p1, p2)
  }

  zoom(zoom: number, point?: Point): { x: number, y: number } {
    const {rect} = this.editor

    point = point || {x: rect.width / 2, y: rect.height / 2}

    return zoomAtPoint.call(this, point, zoom)
  }

  getWorldPointByViewportPoint(x: number, y: number) {
    const {offset, scale} = this
    const dpr = this.dpr

    return screenToWorld(
      {x, y},
      offset,
      scale,
      dpr,
    )
  }

  getViewPointByWorldPoint(x: number, y: number) {
    const {offset, scale, dpr} = this

    return worldToScreen(
      {x, y},
      offset,
      scale,
      dpr,
    )
  }

 /* renderElements() {
    const animate = () => {
      const {scale, dpr, baseCanvasContext: ctx} = this
      const {width, height} = this.editor.config.page
      const frameBorder: RectangleProps = {
        id: nid() + '-frame',
        cx: width / 2,
        cy: height / 2,
        width,
        height,
        // borderRadius: [0, 10, 0, 10],
        stroke: {
          ...DEFAULT_STROKE,
          weight: 1 / scale * dpr,
        },
        layer: -1,
        opacity: 100,
      }

      const frameFill = {
        ...frameBorder, fill: {
          enabled: true,
          color: '#fff',
        },
      }
      // deduplicateObjectsByKeyValue()
      // console.log(this.visibleelementMap.size)
      // deduplicateObjectsByKeyValue

      new ElementRectangle(frameFill).render(ctx)

      this.editor.visible.values.forEach((element) => {
        element.render(ctx)

        /!*   if (element.type === 'image') {
             const {asset} = element as ElementImage

             const obj = this.editor.assetsManager.getAssetsObj(asset)
             // console.log(this.assetsManager, src)
             if (obj) {
               (element as ElementImage).renderImage(ctx, obj.imageRef!)
             }
           }*!/
      })

/!*      this.editor.interaction.transformHandles.forEach(handle => {
        handle.render(ctx)
      })*!/

      new ElementRectangle(frameBorder).render(ctx)

    }

    requestAnimationFrame(animate)
  }*/

/*  renderTransformHandles() {
    const animate = () => {
      console.log(this.editor.interaction.transformHandles)
    }

    requestAnimationFrame(animate)
  }*/

  renderOverlay() {
    // console.log('renderOverlay')

    const animate = () => {
      overlayRender.call(this)
    }

    requestAnimationFrame(animate)
  }

  destroy() {
    // this.baseCanvas.remove()
    // this.overlayCanvas.remove()
    this.creationCanvas.remove()
    // this.baseCanvas = null!
    // this.overlayCanvas = null!
    this.creationCanvas = null!
    // this.baseCanvasContext = null!
    // this.overlayCanvasContext = null!
    this.creationCanvasContext = null!
  }
}

export default World