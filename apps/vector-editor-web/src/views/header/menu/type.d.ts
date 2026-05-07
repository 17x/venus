import type {EditorEventType} from '../../../runtime/types/index.ts'

export interface MenuItemType {
  id: string
  action?: EditorEventType,
  editorActionCode?: EditorEventType,
  editorActionData?: 'up' | 'down' | 'top' | 'bottom' | 'left' | 'hcenter' | 'right' | 'vcenter',
  disabled: boolean
  icon?: string
  divide?: boolean
  children?: MenuItemType[]
}
