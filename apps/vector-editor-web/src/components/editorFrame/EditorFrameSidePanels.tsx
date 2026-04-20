import LeftSidebar from '../shell/LeftSidebar.tsx'
import type {LeftSidebarProps} from '../shell/LeftSidebarShared.tsx'
import RightSidebar, {type RightSidebarProps} from '../shell/RightSidebar.tsx'

const FIXED_LEFT_PANEL_WIDTH = 296
const FIXED_RIGHT_PANEL_WIDTH = 240

interface EditorFrameSidePanelsProps {
  fileName?: string
  leftPanelMinimized: boolean
  rightPanelMinimized: boolean
  showGrid: boolean
  viewportScale: number
  onRestoreLeftPanel: VoidFunction
  onRestoreRightPanel: VoidFunction
  leftSidebarProps: Omit<LeftSidebarProps, 'fileName' | 'leftPanelMinimized' | 'panelWidth' | 'onMinimize'>
  rightSidebarProps: Omit<RightSidebarProps, 'rightPanelMinimized' | 'panelWidth' | 'onMinimize'>
}

export function EditorFrameSidePanels(props: EditorFrameSidePanelsProps) {
  return <>
    <div className={'pointer-events-none absolute left-3 top-3 bottom-3 z-20 flex'}>
        <LeftSidebar
          {...props.leftSidebarProps}
          fileName={props.fileName}
          leftPanelMinimized={props.leftPanelMinimized}
          panelWidth={FIXED_LEFT_PANEL_WIDTH}
          onMinimize={props.onRestoreLeftPanel}
        />
    </div>

    <div className={'pointer-events-none absolute right-3 top-3 bottom-3 z-20 flex'}>
      <div className={'pointer-events-auto h-full overflow-hidden rounded-lg'} style={{width: FIXED_RIGHT_PANEL_WIDTH}}>
        <RightSidebar
          {...props.rightSidebarProps}
          rightPanelMinimized={props.rightPanelMinimized}
          panelWidth={FIXED_RIGHT_PANEL_WIDTH}
          onMinimize={props.onRestoreRightPanel}
        />
      </div>
    </div>

    {props.showGrid &&
      <div
        className={'pointer-events-none absolute inset-0 z-10'}
        style={{
          backgroundImage: 'linear-gradient(to right, rgba(15, 23, 42, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(15, 23, 42, 0.08) 1px, transparent 1px)',
          backgroundSize: `${Math.max(12, Math.round(24 * props.viewportScale))}px ${Math.max(12, Math.round(24 * props.viewportScale))}px`,
        }}
      />}
  </>
}