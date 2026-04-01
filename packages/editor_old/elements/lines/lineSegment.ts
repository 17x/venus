import ElementBase, {ElementBaseProps} from '~/elements/base/elementBase'
import {BoundingRect, Point, UID} from '~/type'
import {generateBoundingRectFromRect, generateBoundingRectFromRotatedRect} from '~/core/utils'
import {HistoryChangeItem} from '~/services/actions/type'
import deepClone from '~/core/deepClone'

export interface LineSegmentProps extends ElementBaseProps {
  // id: string
  // layer: number
  type?: 'lineSegment'
  start: Point
  end: Point
  // points: [{ id: 'start' } & Point, { id: 'end' } & Point]
}

export type RequiredLineSegmentProps = Required<LineSegmentProps>

class ElementLineSegment extends ElementBase {
  readonly type = 'lineSegment'
  start: Point
  end: Point

  constructor({
                start,
                end,
                ...rest
              }: LineSegmentProps) {
    super(rest)
    this.start = {...start}
    this.end = {...end}
    this.original = {
      ...this.original,
      start: {...start},
      end: {...end},
      rotation: this.rotation,
    }
    this.updatePath2D()
    this.updateBoundingRect()
  }

  static create(id: UID, sX: number, sY: number, eX: number, eY: number): ElementLineSegment {
    const centerX = (sX + eX) / 2
    const centerY = (sY + eY) / 2

    return new ElementLineSegment({
      id,
      layer: 0,
      cx: centerX,
      cy: centerY,
      start: {x: sX, y: sY},
      end: {x: eX, y: eY},
    })
  }

  static _getBoundingRect(start: Point, end: Point, rotation: number = 0): BoundingRect {
    const x = Math.min(start.x, end.x)
    const y = Math.min(start.y, end.y)
    let width = Math.abs(end.x - start.x)
    let height = Math.abs(end.y - start.y)

    if (width <= 0) {
      width = 1
    }
    if (height <= 0) {
      height = 1
    }

    if (rotation === 0) {
      return generateBoundingRectFromRect({x, y, width, height})
    }

    return generateBoundingRectFromRotatedRect({x, y, width, height}, rotation)
  }

  public updatePath2D() {
    const {cx, cy, start, end, rotation} = this

    const matrix = new DOMMatrix()
      .translate(cx, cy)
      .rotate(rotation)
      .translate(-cx, -cy)

    const rotatedStart = ElementBase.transformPoint(start.x, start.y, matrix)
    const rotatedEnd = ElementBase.transformPoint(end.x, end.y, matrix)

    this.path2D = new Path2D()
    this.path2D.moveTo(rotatedStart.x, rotatedStart.y)
    this.path2D.lineTo(rotatedEnd.x, rotatedEnd.y)
  }

  public updateOriginal() {
    this.original.cx = this.cx
    this.original.cy = this.cy
    this.original.start = {...this.start}
    this.original.end = {...this.end}
    this.original.rotation = this.rotation
    // this.updatePath2D()
    this.updateOriginalBoundingRect()
  }

  public getBoundingRect(withoutRotation: boolean = false): BoundingRect {
    const {start, end, rotation} = this
    const r = withoutRotation ? -rotation : 0

    return ElementLineSegment._getBoundingRect(start, end, r)
  }

  public getBoundingRectFromOriginal(withoutRotation: boolean = false) {
    const {start, end, rotation} = this.original
    const r = withoutRotation ? -rotation : 0

    return ElementLineSegment._getBoundingRect(start!, end!, r)
  }

  public translate(dx: number, dy: number, f: boolean = false): HistoryChangeItem | undefined {
    this.cx = this.cx + dx
    this.cy = this.cy + dy
    this.start.x += dx
    this.start.y += dy
    this.end.x += dx
    this.end.y += dy
    this.updatePath2D()

    this.eventListeners['move']?.forEach(handler => handler({dx, dy}))

    if (f) {
      return {
        id: this.id,
        from: {
          cx: this.original.cx,
          cy: this.original.cy,
          start: deepClone(this.original.start),
          end: deepClone(this.original.end),
        },
        to: {
          cx: this.cx,
          cy: this.cy,
          start: deepClone(this.start),
          end: deepClone(this.end),
        },
      }
    }
  }

  public scaleFrom(scaleX: number, scaleY: number, anchor: Point/*,center:Point*/) {
    const matrix = new DOMMatrix()
      .translate(anchor.x, anchor.y)
      .scale(scaleX, scaleY)
      .translate(-anchor.x, -anchor.y)

    const {start, end} = this.original
    // Adjust to absolute coordinates for transformation
    const newStart = ElementBase.transformPoint(start!.x, start!.y, matrix)
    const newEnd = ElementBase.transformPoint(end!.x, end!.y, matrix)

    this.start.x = newStart.x
    this.start.y = newStart.y
    this.end.x = newEnd.x
    this.end.y = newEnd.y
    this.cx = (newStart.x + newEnd.x) / 2
    this.cy = (newStart.y + newEnd.y) / 2
    this.updatePath2D()
    this.updateBoundingRect()
  }

  public toJSON(): RequiredLineSegmentProps {
    return {
      ...super.toJSON(),
      type: this.type,
      start: {...this.start},
      end: {...this.end},
    }
  }

  public toMinimalJSON(): LineSegmentProps {
    return {
      ...super.toMinimalJSON(),
      type: this.type,
      start: {...this.start},
      end: {...this.end},

    }
  }
}

export default ElementLineSegment