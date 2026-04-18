import MenuBar from './menu/Menu.tsx'
import ShortcutBar from './shortcutBar/ShortcutBar.tsx'
import {EditorExecutor} from '../../editor/hooks/useEditorRuntime.ts'
import type {SelectedElementProps} from '../../editor/hooks/useEditorRuntime.types.ts'

const Header: React.FC<{
  executeAction: EditorExecutor
  onOpenTemplatePresetPicker: VoidFunction
  needSave: boolean
  historyStatus: {
    id: number
    hasPrev: boolean
    hasNext: boolean
  }
  selectedIds: string[]
  selectedProps: SelectedElementProps | null
  copiedCount: number
}> = ({executeAction, onOpenTemplatePresetPicker, needSave, historyStatus, selectedIds, selectedProps, copiedCount}) => {
  return <header>
    <MenuBar
      executeAction={executeAction}
      selectedIds={selectedIds}
      copiedCount={copiedCount}
      needSave={needSave}
      historyStatus={historyStatus}
    />
    <ShortcutBar executeAction={executeAction}
                 onOpenTemplatePresetPicker={onOpenTemplatePresetPicker}
                 historyStatus={historyStatus}
                 selectedIds={selectedIds}
                 selectedProps={selectedProps}/>
  </header>
}
export default Header
