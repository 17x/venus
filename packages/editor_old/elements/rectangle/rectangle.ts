import {CenterBasedRect, UID} from '~/type'
import RectangleLike, {RectangleLikeProps} from '~/elements/rectangle/rectangleLike'
import ElementPath from '~/elements/path/path'

export interface RectangleProps extends RectangleLikeProps {
  type?: 'rectangle'
}

export type RequiredRectangleProps = Required<RectangleProps>

class ElementRectangle extends RectangleLike {
  readonly type = 'rectangle'

  constructor(props: RectangleProps) {
    super(props)
    this.updatePath2D()
    this.updateBoundingRect()
  }

  static create(id: UID, cx: number, cy: number, width: number = 10, height?: number) {
    const _height = height || width

    const props = {
      id,
      width,
      cx,
      cy,
      height: _height,
      layer: 0,
    }

    return new ElementRectangle(props)
  }

  override toJSON(): RequiredRectangleProps {
    return {
      ...super.toJSON(),
      type: this.type,
    }
  }

  override toMinimalJSON(): RectangleProps {
    return {
      ...super.toMinimalJSON(),
      type: this.type,
    }
  }
}

export default ElementRectangle
