import {VisionEventType} from '../../../editor/engine/actions/type'

export interface MenuItemType {
  id: string
  action?: VisionEventType,
  editorActionCode?: VisionEventType,
  editorActionData?: 'up' | 'down' | 'top' | 'bottom',
  disabled: boolean
  icon?: string
  divide?: boolean
  children?: MenuItemType[]
}