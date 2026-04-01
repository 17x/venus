import render from './render'
import RectangleLike, {RectangleLikeProps} from '~/elements/rectangle/rectangleLike'
import {Asset} from '~/elements/props'
import deepClone from '~/core/deepClone'

export interface ImageProps extends RectangleLikeProps {
  type?: 'image'
  asset: Asset
}

export type RequiredImageProps = Required<ImageProps>

class ElementImage extends RectangleLike {
  readonly type = 'image'
  asset: Asset

  constructor({
                asset,
                ...rest
              }: ImageProps) {
    super(rest)

    this.asset = asset
    // this.updateTransform()

  }

  public toJSON(): RequiredImageProps {
    return {
      ...super.toJSON(),
      asset: deepClone(this.asset),
      type: this.type,
    }
  }

  public toMinimalJSON(): ImageProps {
    return {
      ...super.toMinimalJSON(),
      asset: deepClone(this.asset),
      type: this.type,
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    render.call(this, ctx)
  }
}

export default ElementImage