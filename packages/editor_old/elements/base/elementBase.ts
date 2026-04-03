import {BoundingRect, ElementProps, Point, UID} from '~/type'
import {generateBoundingRectFromTwoPoints} from '~/core/utils'
import {
  DEFAULT_CX,
  DEFAULT_CY,
  DEFAULT_FILL,
  DEFAULT_GRADIENT,
  DEFAULT_OPACITY,
  DEFAULT_ROTATION,
  DEFAULT_SHADOW,
  DEFAULT_STROKE,
  DEFAULT_TRANSFORM,
} from '~/elements/defaultProps'
import deepClone from '~/core/deepClone'
import {isEqual} from '~/lib/lib'
import {BezierPoint, Fill, Gradient, Shadow, Stroke, Transform} from '~/elements/props'
import {HistoryChangeItem} from '~/services/actions/type'
import {CanvasHostEvent} from '~/services/element/CanvasHost'
import ElementPath from '~/elements/path/path'

type ElementEventHandler<T = any> = (payload: T) => void;

/*{
    type: 'mouseleave',
    x,
    y,
    pointerId,
    target: this._hoveredElement,
  originalEvent: domEvent,
  isPropagationStopped: false,
  stopPropagation() {},
}*/

interface ElementEventMap {
  onmouseenter: { dx: number; dy: number };
  onmouseleave: { dx: number; dy: number };
  onmousedown: { scaleX: number; scaleY: number };
  onmousemove: { angle: number };

  [key: string]: any;
}

export interface ElementBaseProps {
  id: UID,
  layer: number
  stroke?: Stroke;
  fill?: Fill;
  opacity?: number;
  shadow?: Shadow
  rotation?: number
  transform?: Transform
  show?: boolean
  cx?: number
  cy?: number
  gradient?: Gradient

  // toJSON: () => ElementProps
}

export type RequiredBaseProps = Required<ElementBaseProps>
interface ElementStyle{
  cx: number;
  cy: number;
  width?: number,
  height?: number,
  rotation: number,
  // points?: BezierPoint[],
  [key: string]: unknown
}

class ElementBase {
  id: UID
  layer: number
  cx: number
  cy: number
  gradient: Gradient
  stroke: Stroke
  fill: Fill
  opacity: number
  shadow: Shadow
  rotation: number
  transform: Transform
  show: boolean
  path2D = new Path2D()
  boundingRect: BoundingRect
  originalBoundingRect: BoundingRect
  originalBoundingRectWithRotation: BoundingRect
  _shadowPath?: ElementPath
  _transforming: boolean = false

  protected original: {
    cx: number;
    cy: number;
    rotation: number,
    points?: BezierPoint[],
    start?: Point,
    end?: Point,
    width?: number,
    height?: number,
    r1?: number,
    r2?: number,
    closed?: boolean,
    [key: string]: unknown
  }
  // public _relatedId: string
  protected eventListeners: {
    [K in keyof ElementEventMap]?: ElementEventHandler<ElementEventMap[K]>[]
  } = {}
  onmouseenter?: (event: CanvasHostEvent) => void
  onmouseleave?: (event: CanvasHostEvent) => void
  onmousedown?: (event: CanvasHostEvent) => void
  onmousemove?: (event: CanvasHostEvent) => void
  onmouseup?: (event: CanvasHostEvent) => void

  constructor({
                id,
                layer,
                cx = DEFAULT_CX,
                cy = DEFAULT_CY,
                gradient = DEFAULT_GRADIENT,
                stroke = deepClone(DEFAULT_STROKE),
                fill = deepClone(DEFAULT_FILL),
                opacity = DEFAULT_OPACITY,
                rotation = DEFAULT_ROTATION,
                shadow = deepClone(DEFAULT_SHADOW),
                transform = deepClone(DEFAULT_TRANSFORM),
                show = true,
              }: ElementBaseProps) {
    this.id = id
    this.layer = layer
    this.cx = cx
    this.cy = cy
    this.stroke = stroke
    this.fill = fill
    this.opacity = opacity
    this.shadow = shadow
    this.rotation = rotation
    this.transform = transform
    this.show = show
    this.gradient = gradient

    this.original = {
      cx: this.cx,
      cy: this.cy,
      rotation: this.rotation,
    }
    const rect = generateBoundingRectFromTwoPoints({x: 0, y: 0}, {x: 0, y: 0})

    this.boundingRect = rect
    this.originalBoundingRect = rect
    this.originalBoundingRectWithRotation = rect
  }

  static transformPoint(x: number, y: number, matrix: DOMMatrix): Point {
    const p = matrix.transformPoint({x, y})
    return {x: p.x, y: p.y}
  }

  on<K extends keyof ElementEventMap>(
    event: K,
    handler: ElementEventHandler<ElementEventMap[K]>,
  ) {
    if (!this.eventListeners[event]) this.eventListeners[event] = []
    this.eventListeners[event]!.push(handler)
  }

  // dispatch
  dispatchEvent(eventData: { type: string; [key: string]: any }) {
    /*    if(eventData.type ==='mouseenter'){
          debugger
        }*/
    eventData.type === 'mouseenter' && this.onmouseenter?.(eventData)
    eventData.type === 'mouseleave' && this.onmouseleave?.(eventData)
    eventData.type === 'mousedown' && this.onmousedown?.(eventData)
    eventData.type === 'mousemove' && this.onmousemove?.(eventData)
    eventData.type === 'mouseup' && this.onmouseup?.(eventData)
    const handlers = this.eventListeners[eventData.type as keyof ElementEventMap]
    if (!handlers) return

    for (const handler of handlers) {
      handler(eventData)
      if (eventData.isPropagationStopped) break
    }
  }

  set transforming(v: boolean) {
    if (v) {
      if (!this._shadowPath) {
        this._shadowPath = this.toPath()
      }
    } else {
      this._shadowPath = null!
    }

    this._transforming = v
  }

  public translate(dx: number, dy: number, f: boolean = false): HistoryChangeItem | undefined {
    this.cx = this.cx + dx
    this.cy = this.cy + dy
    this.updatePath2D()
    this.updateBoundingRect()

    this.eventListeners['move']?.forEach(handler => handler({dx, dy}))

    if (f) {
      return {
        id: this.id,
        from: {
          cx: this.original.cx,
          cy: this.original.cy,
        },
        to: {
          cx: this.cx,
          cy: this.cy,
        },
      }
    }
  }

  /* Invoke updateOriginal method when you do accept the element's current state as static state */
  public updateOriginal() {}

  public updateBoundingRect() {
    this.boundingRect = this.getBoundingRect()
  }

  public updateOriginalBoundingRect() {
    this.originalBoundingRect = this.getBoundingRectFromOriginal()
    this.originalBoundingRectWithRotation = this.getBoundingRectFromOriginal(true)
  }

  /*  protected rotate(angle: number) {
      this.rotation = angle
      this.updatePath2D()
      this.updateBoundingRect()

      // this.updateTransform()
    }*/

  protected rotateFrom(rotation: number, anchor: Point, f: boolean = false): HistoryChangeItem | undefined {
    const matrix = new DOMMatrix()
      .translate(anchor.x, anchor.y)
      .rotate(rotation)
      .translate(-anchor.x, -anchor.y)
    const {cx, cy} = this.original
    const transformed = matrix.transformPoint({x: cx, y: cy})
    let newRotation = (this.original.rotation + rotation) % 360

    if (newRotation < 0) newRotation += 360

    this.rotation = newRotation
    this.cx = transformed.x
    this.cy = transformed.y

    this.updatePath2D()
    this.updateBoundingRect()

    if (f) {
      return {
        id: this.id,
        from: {
          cx: this.original.cx,
          cy: this.original.cy,
          rotation: this.original.rotation,
        },
        to: {
          cx: this.cx,
          cy: this.cy,
          rotation: this.rotation,
        },
      }
    }
  }

  protected get center(): Point {
    return {x: this.cx, y: this.cy}
  }

  public toJSON(): RequiredBaseProps {
    const {
      id,
      cx,
      cy,
      rotation,
      layer,
      show,
      stroke,
      fill,
      opacity,
      shadow,
      gradient,
      transform,
    } = this

    return {
      id,
      layer,
      show,
      cx,
      cy,
      gradient: deepClone(gradient),
      stroke: deepClone(stroke),
      fill: deepClone(fill),
      opacity: opacity,
      shadow: deepClone(shadow),
      rotation: rotation,
      transform: deepClone(transform),
    }
  }

  protected toMinimalJSON(): ElementBaseProps {
    const result: ElementBaseProps = {id: this.id, layer: this.layer}

    if (!this.show) {
      result.show = false
    }

    if (this.cx !== DEFAULT_CX) {
      result.cx = this.cx
    }

    if (this.cy !== DEFAULT_CY) {
      result.cy = this.cy
    }

    if (!isEqual(this.gradient, DEFAULT_GRADIENT)) {
      result.gradient = deepClone(this.gradient)
    }

    if (!isEqual(this.stroke, DEFAULT_STROKE)) {
      result.stroke = deepClone(this.stroke)
    }

    if (!isEqual(this.fill, DEFAULT_FILL)) {
      result.fill = deepClone(this.fill)
    }

    if (!isEqual(this.opacity, DEFAULT_OPACITY)) {
      result.opacity = this.opacity
    }

    if (!isEqual(this.shadow, DEFAULT_SHADOW)) {
      result.shadow = deepClone(this.shadow)
    }

    if (!isEqual(this.rotation, DEFAULT_ROTATION)) {
      result.rotation = this.rotation
    }

    if (!isEqual(this.transform, DEFAULT_TRANSFORM)) {
      result.transform = deepClone(this.transform)
    }

    return result
  }

  protected getBoundingRect(): BoundingRect {
    return generateBoundingRectFromTwoPoints({x: 0, y: 0}, {x: 0, y: 0})
  }

  // @ts-ignore
  protected getBoundingRectFromOriginal(withoutRotation: boolean = false): BoundingRect {
    return generateBoundingRectFromTwoPoints({x: 0, y: 0}, {x: 0, y: 0})
  }

  // @ts-ignore
  public toPath(): ElementPath { }

  public updateTransform() {
    const {cx, cy, width, height} = this.getBoundingRect()
    this.transform = {
      cx, cy, width, height,
      rotation: this.rotation,
    }
  }

  public updatePath2D() { }

  public restore(props: Partial<ElementProps>) {
    Object.assign(this, props)
    Object.assign(this.original, props)

    this.updatePath2D()
    this.updateBoundingRect()
    this.updateOriginalBoundingRect()
  }

  protected getTransformedPoints(): Point[] {
    return []
  }

  protected getCenter(): Point {
    return {x: 0, y: 0}
  }

  public clone() {
    if (this._transforming && this._shadowPath) {
      return this._shadowPath.clone()
    }

    const data = this.toJSON()
    const ctor = this.constructor as new (data: any) => this
    return new ctor(data)
  }

  public render(ctx: CanvasRenderingContext2D): void {
    let {show, opacity, fill, stroke, path2D} = this
    const {enabled: enabledFill, color: fillColor} = fill
    const {enabled: enabledStroke, color: strokeColor, weight /*join, cap*/} = stroke

    if (!path2D || !show || opacity <= 0) return

    ctx.save()

    if (opacity < 100) {
      ctx.globalAlpha = opacity / 100
    }

    if (enabledFill) {
      ctx.fillStyle = fillColor
      ctx.fill(this.path2D)
    }

    if (enabledStroke && weight > 0) {
      ctx.lineWidth = weight
      ctx.strokeStyle = strokeColor
      // ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.stroke(this.path2D)
    }

    ctx.restore()
  }
}

export default ElementBase