export interface EditorMenuItem {
  id: string
  disabled?: boolean
  shortcut?: string
  divide?: boolean
  children?: EditorMenuItem[]
}

export type EditorMenuActionHandler = (item: EditorMenuItem) => void

export type EditorMenuTranslate = (id: string, field: 'label' | 'tooltip') => string
