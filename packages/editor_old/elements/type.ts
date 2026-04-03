import ElementRectangle, {RectangleProps} from './rectangle/rectangle'
import ElementEllipse, {EllipseProps} from './ellipse/ellipse'
import ElementImage, {ImageProps} from './image/image'
import ElementText, {TextProps} from '~/elements/text/text'
import ElementLineSegment, {LineSegmentProps} from '~/elements/lines/lineSegment'
import {UID} from '~/type'
import ElementPath, {PathProps} from '~/elements/path/path'

/*export type ElementTypeMap = {
  'rectangle': ElementRectangle
  'ellipse': ElementEllipse
}*/
export type ElementPropsMap = {
  'rectangle': RectangleProps
  'ellipse': EllipseProps
  'image': ImageProps
  'text': TextProps
  'lineSegment': LineSegmentProps
  'path': PathProps
}
export type ElementProps = RectangleProps | EllipseProps | TextProps | ImageProps | LineSegmentProps | PathProps
export type OptionalIdentifiersProps = Omit<ElementProps, 'id' | 'layer'> & { id?: UID, layer?: number }
export type PropsWithoutIdentifiers<T extends keyof ElementPropsMap> = Omit<ElementPropsMap[T], 'id' | 'layer'>
export type ElementInstance =
  InstanceType<typeof ElementRectangle>
  | InstanceType<typeof ElementEllipse>
  | InstanceType<typeof ElementImage>
  | InstanceType<typeof ElementText>
  | InstanceType<typeof ElementLineSegment>
  | InstanceType<typeof ElementPath>
export type ElementMap = Map<UID, ElementInstance>

