import Editor from '~/main/editor'
import {ElementInstance, ElementMap, ElementProps, OptionalIdentifiersProps} from '~/elements/type'
import deepClone from '~/core/deepClone'
import nid from '~/core/nid'
import ElementRectangle from '~/elements/rectangle/rectangle'
import ElementEllipse from '~/elements/ellipse/ellipse'
import ElementText from '~/elements/text/text'
import ElementImage from '~/elements/image/image'
import {BoundingRect, Point, UID} from '~/type'
import ElementLineSegment from '~/elements/lines/lineSegment'
import ElementPath from '~/elements/path/path'
import {createWith} from '~/lib/lib'
import {rectsOverlap} from '~/core/utils'

const STYLE = {
  position: 'absolute',
  left: '0',
  top: '0',
  width: '100%',
  height: '100%',
  pointerEvents: 'none',
}
export type CanvasHostEvent = { element: ElementInstance | null, originalEvent: MouseEvent }
export type CanvasHostEventHandler = (event: CanvasHostEvent) => void

class CanvasHost {
  protected elementMap: ElementMap = new Map()
  protected visible: ElementMap = new Map()
  protected editor: Editor
  protected eventsController = new AbortController()
  protected canvas: HTMLCanvasElement
  protected _ctx: CanvasRenderingContext2D
  protected dpr = 4
  protected _hoveredElement: ElementInstance | null = null
  readonly _locked = false
  onmousedown?: CanvasHostEventHandler
  onmouseup?: CanvasHostEventHandler
  onmousemove?: CanvasHostEventHandler
  oncontextmenu?: CanvasHostEventHandler

  constructor(editor: Editor, identifier?: string) {
    this.editor = editor
    const {signal} = this.eventsController
    const {container} = editor
    this.editor = editor
    this.canvas = createWith('canvas', {...STYLE})
    this._ctx = this.canvas.getContext('2d')!
    this._locked = false

    if (identifier) {
      this.canvas.setAttribute('role', identifier)
    }
    // this.canvas.style.imageRendering = 'pixelate'
    container.appendChild(this.canvas)

    container.addEventListener('pointerdown', e => {
      if (e.button === 0) {
        container.setPointerCapture(e.pointerId)
        this.dispatchEvent(e, 'mousedown')
        this.onmousedown?.({
          element: this._hoveredElement,
          originalEvent: e,
        })
      }
    }, {signal, passive: false})

    container.addEventListener('pointerup', e => {
      container.releasePointerCapture(e.pointerId)

      if (e.button === 0) {
        this.dispatchEvent(e, 'mouseup')
        this.onmouseup?.({
          element: this._hoveredElement,
          originalEvent: e,
        })
      }

      if (e.button === 2) {
        this.dispatchEvent(e, 'contextmenu')
        this.oncontextmenu?.({
          element: this._hoveredElement,
          originalEvent: e,
        })
      }

    }, {signal})

    container.addEventListener('pointermove', e => {
      this.dispatchEvent(e, 'mousemove')
      this.onmousemove?.({
        element: this._hoveredElement,
        originalEvent: e,
      })
    }, {signal})

    container.addEventListener('contextmenu', e => {
      e.preventDefault()
      e.stopPropagation()
    }, {signal})
  }

  lock() {this._locked = true}

  unlock() {this._locked = false}

  public dispatchEvent(domEvent: PointerEvent, type: PointerEvent['type'], options?: { tolerance?: number }) {
    const {_ctx} = this
    const dpr = this.editor.config.dpr
    const {offsetX: x, offsetY: y, pointerId} = domEvent
    const elements = this.visibleElements.sort((a, b) => b.layer - a.layer)
    const vx = x * dpr
    const vy = y * dpr
    let _ele: ElementInstance | null = null

    for (const el of elements) {
      const {path2D, fill} = el
      let f1 = false
      let f2 = false

      if (el.stroke.enabled) {
        _ctx.save()
        // console.log(el.stroke.weight)
        _ctx.lineWidth = el.stroke.weight
        f1 = _ctx.isPointInStroke(path2D, vx, vy)
        _ctx.restore()
      }

      f2 = _ctx.isPointInPath(path2D, vx, vy)

      if (f1 || (f2 && fill.enabled)) {
        _ele = el
        break
      }
    }

    if (type === 'mousemove') {
      if (_ele !== this._hoveredElement) {
        // mouseleave for old
        this._hoveredElement?.dispatchEvent?.({
          type: 'mouseleave',
          x,
          y,
          pointerId,
          target: this._hoveredElement,
          originalEvent: domEvent,
          isPropagationStopped: false,
          stopPropagation() {},
        })

        // mouseenter for new
        _ele?.dispatchEvent?.({
          type: 'mouseenter',
          x,
          y,
          pointerId,
          target: _ele,
          originalEvent: domEvent,
          isPropagationStopped: false,
          stopPropagation() {},
        })

        this._hoveredElement = _ele
      }
    }

    if (!_ele) return

    const event = {
      type,
      x,
      y,
      pointerId,
      originalEvent: domEvent,
      target: _ele,
      isPropagationStopped: false,
      stopPropagation() {
        event.isPropagationStopped = true
      },
    }
    // console.log(type, this._hoveredElement)
    _ele.dispatchEvent?.(event)
  }

  public has(id: string): boolean {
    return this.elementMap.has(id)
  }

  public get ctx(): CanvasRenderingContext2D {
    return this._ctx
  }

  public get size(): number {
    return this.elementMap.size
  }

  public get allIds(): Set<UID> {
    const set: Set<UID> = new Set()

    this.elementMap.forEach((element) => {
      set.add(element.id)
    })

    return set
  }

  public get elements(): ElementInstance[] {
    return [...this.elementMap.values()]
  }

  public get all(): ElementMap {
    return new Map(this.elementMap)
  }

  public get visibleElements(): ElementInstance[] {
    return [...this.visible.values()]
  }

  public updateVisible() {

    this.visible.clear()
    // let _start = Date.now()
    // Create an array from the Map, sort by the 'layer' property,
    const sortedElements = this.elements
      .filter((element) => {

        const boundingRect = element.boundingRect as BoundingRect
        return rectsOverlap(boundingRect, this.editor.world.worldRect)
      })
      .sort((a, b) => a.layer - b.layer)

    sortedElements.forEach(element => {
      this.visible.set(element.id, element)
    })
  }

  public get getMaxLayerIndex(): number {
    let max = Number.MIN_SAFE_INTEGER

    this.elementMap.forEach((ele) => {
      max = Math.max(ele.layer, max)
    })

    return max
  }

  public setSize(width: number, height: number): void {
    this.canvas.width = width
    this.canvas.height = height
  }

  public getElementById(id: string): ElementInstance | undefined {
    return this.elementMap.get(id)
  }

  public getElementsByIdSet(idSet: Set<UID>): ElementInstance[] {
    const result: ElementInstance[] = []

    ;[...idSet.values()].map(id => {
      const mod = this.elementMap.get(id)

      if (mod) {
        result.push(mod)
      }
    })

    return result
  }

  public getVisibleElementsByIdSet(idSet: Set<UID>): ElementInstance[] {
    const result: ElementInstance[] = []

    idSet.forEach(id => {
      const mod = this.visible.get(id)

      if (mod) {
        result.push(mod)
      }
    })

    return result
  }

  public getElementMapByIdSet(idSet: Set<UID>): ElementMap {
    const result: ElementMap = new Map()

    idSet.forEach((id) => {
      const mod = this.elementMap.get(id)
      if (mod) {
        result.set(id, mod)
      }
    })

    return result
  }

  create(data: OptionalIdentifiersProps): ElementInstance | false {
    if (!data || !data.type) {
      console.error('Data or Type missed')
      return false
    }

    if (!data.id) {
      let id = nid()

      // ensure short id no repeat
      if (this.elementMap.has(id)) {
        id = nid()
      }

      data.id = id
    }

    if (isNaN(data.layer)) {
      const maxLayer = this.getMaxLayerIndex

      data.layer = maxLayer + 1
    }

    if (data.type === 'rectangle') {
      return new ElementRectangle(data)
    }

    if (data.type === 'ellipse') {
      return new ElementEllipse(data)
    }

    if (data.type === 'text') {
      return new ElementText(data)
    }

    if (data.type === 'image') {
      return new ElementImage(data)
    }

    if (data.type === 'lineSegment') {
      return new ElementLineSegment(data)
    }

    if (data.type === 'path') {
      return new ElementPath(data)
    }

    return false
  }

  replace(args: { from: ElementInstance, to: ElementInstance }[]) {
    args.forEach((arg) => {
      this.elementMap.set(arg.from.id, arg.to)
    })
  }

  batchCreate(elementDataList: ElementProps[]): ElementMap {
    const clonedData = deepClone(elementDataList) as ElementProps[]
    const newMap: ElementMap = new Map()
    // let localMaxLayer = 0

    /*    if (isNaN(data.layer)) {
          const maxFromelementMap = this.getMaxLayerIndex

          localMaxLayer = Math.max(localMaxLayer, maxFromelementMap)
          localMaxLayer++

          data.layer = localMaxLayer
        }*/

    clonedData.forEach(data => {
      const element = this.create(data)

      if (element) {
        newMap.set(data.id, element as ElementInstance)
      }
    })

    return newMap
  }

  append(...args: ElementInstance[]): void {
    args.forEach(el => {
      this.elementMap.set(el.id, el)
    })
  }

  batchAdd(elements: ElementMap, callback?: VoidFunction): ElementMap {
    elements.forEach(mod => {
      this.append(mod)
    })

    callback && callback()

//       this.assetsManager.add('image', data.src)
    // this.events.onElementsUpdated?.(this.elementMap)
    /* if (callback) {
       const pArr = []
       elements.forEach(mod => {
         if (mod.type === 'image') {
           const {src} = mod as ElementImage

           if (src && !this.assetsManager.getAssetsObj(src)) {
             // @ts-ignore
             pArr.push(this.assetsManager.add('image', src))
           }
         }
       })

       // @ts-ignore
       Promise.all(pArr).then((objs: VisionEditorAssetType[]) => objs).finally((objs) => {
         callback(objs)
       })
     }*/

    return elements
  }

  batchCopy(idSet: Set<UID>, includeIdentifiers: boolean = true): ElementProps[] | OptionalIdentifiersProps[] {
    // const elementsMap: ElementMap = new Map()
    const elementArr: ElementInstance[] = []

    idSet.forEach(id => {
      const mod = this.elementMap.get(id)
      if (mod) {
        elementArr.push(mod)
        // elementsMap.set(id, mod)
      }
    })

    elementArr.sort((a, b) => a.layer - b.layer)

    return elementArr.map(mod => {
      let {id, layer, ...rest} = mod.toMinimalJSON()

      if (includeIdentifiers) {
        return {id, layer, ...rest}
      }

      return rest
    })
  }

  batchDelete(idSet: Set<UID>): ElementProps[] {
    const backup: ElementProps[] = this.batchCopy(idSet)

    backup.forEach(element => {
      this.elementMap.delete(element.id)
    })

    // this.events.onElementsUpdated?.(this.elementMap)

    return backup
  }

  batchMove(from: Set<UID>, delta: Point) {
    const elementsMap: ElementMap = this.getElementMapByIdSet(from)

    elementsMap.forEach((element: ElementInstance) => {
      element.cx += delta.x
      element.cy += delta.y
    })
  }

  batchModify(idSet: Set<UID>, data: Partial<ElementProps>) {
    const elementsMap = this.getElementMapByIdSet(idSet)

    elementsMap.forEach((element: ElementInstance) => {
      Object.keys(data).forEach((key) => {
        const keyName = key as keyof ElementProps
        // @ts-ignore
        element[keyName] = data[key]
      })
    })
  }

  render() {
    this.visibleElements.forEach((element) => {
      element.render(this._ctx)
    })
  }

  reset() {
    // console.log('de')
    this.elementMap.clear()
    this.visible.clear()
    this._hoveredElement = null
  }

  destroy() {
    // cancelAnimationFrame(this._rqId)
    /*this._timer = requestAnimationFrame(() => {
      this.render()
    })*/
    this.canvas.remove()
    this.elementMap.clear()
    this.visible.clear()
    this.eventsController.abort()
    this.canvas = null!
    this.elementMap = null!
    this.visible = null!
    this.eventsController = null!
  }
}

export default CanvasHost