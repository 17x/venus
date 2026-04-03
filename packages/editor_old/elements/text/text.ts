import RectangleLike, {RectangleLikeProps} from '../rectangle/rectangleLike'
import render from './render'
import {HorizontalAlign, TextFontProps, TextRun, VerticalAlign} from '~/elements/props'
import deepClone from '~/core/deepClone'
import {
  DEFAULT_FONT,
  DEFAULT_HORIZONTAL_ALIGN, DEFAULT_TEXT_FILL,
  DEFAULT_TEXT_FONT,
  DEFAULT_VERTICAL_ALIGN,
} from '~/elements/defaultProps'
import {isEqual} from '~/lib/lib'

/*
const CONTENT = `
Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.
Lorem ipsum dolor sit amet, cons ectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.
Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi 
`*/

export interface TextProps extends RectangleLikeProps {
  type?: 'text'
  content: TextRun[]
  font?: TextFontProps;
  verticalAlign?: VerticalAlign
  horizontalAlign?: HorizontalAlign
}

export type RequiredTextProps = Required<TextProps>

class ElementText extends RectangleLike {
  readonly type = 'text'
  content: TextRun[]
  font: TextFontProps
  verticalAlign: VerticalAlign
  horizontalAlign: HorizontalAlign

  constructor({
                content = [],
                font = deepClone(DEFAULT_TEXT_FONT),
                verticalAlign = DEFAULT_VERTICAL_ALIGN,
                horizontalAlign = DEFAULT_HORIZONTAL_ALIGN,
                ...rest
              }: TextProps) {
    super({...rest})
    this.content = content
    this.font = font
    this.verticalAlign = verticalAlign
    this.horizontalAlign = horizontalAlign
    this.fill = deepClone(DEFAULT_TEXT_FILL)

  }

  override toJSON(): RequiredTextProps {
    return {
      ...super.toJSON(),
      type: this.type,
      content: deepClone(this.content),
      font: deepClone(this.font),
      verticalAlign: this.verticalAlign,
      horizontalAlign: this.horizontalAlign,
    }
  }

  public toMinimalJSON(): TextProps {
    const result: TextProps = {
      ...super.toMinimalJSON(),
      type: this.type,
      content: deepClone(this.content),
      font: deepClone(this.font),
      verticalAlign: this.verticalAlign,
      horizontalAlign: this.horizontalAlign,
    }

    if (this.verticalAlign !== DEFAULT_VERTICAL_ALIGN) {
      result.verticalAlign = this.verticalAlign
    }

    if (this.horizontalAlign !== DEFAULT_HORIZONTAL_ALIGN) {
      result.horizontalAlign = this.horizontalAlign
    }

    if (!isEqual(this.font, DEFAULT_FONT)) {
      result.horizontalAlign = this.horizontalAlign
    }

    return result
  }

  /*  public getOperators(
      resizeConfig: { lineWidth: number, lineColor: string, size: number, fillColor: string },
      rotateConfig: { lineWidth: number, lineColor: string, size: number, fillColor: string },
    ) {

      return super.getOperators(resizeConfig, rotateConfig, this.getRect(), this.toMinimalJSON(true))
    }*/

  render(ctx: CanvasRenderingContext2D): void {
    super.render(ctx)
    render.call(this, ctx)
  }
}

export default ElementText