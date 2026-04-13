import type {VisionEventType} from '@lite-u/editor/types'

export interface MenuItemType {
  id: string
  action?: VisionEventType,
  editorActionCode?: VisionEventType,
  editorActionData?: 'up' | 'down' | 'top' | 'bottom' | 'left' | 'hcenter' | 'right' | 'vcenter',
  disabled: boolean
  icon?: string
  divide?: boolean
  children?: MenuItemType[]
}
