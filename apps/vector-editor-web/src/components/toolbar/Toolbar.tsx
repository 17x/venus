import React from 'react'
import {cn, Tooltip} from '@vector/ui'
import {ToolName} from '@venus/document-core'
import {
  LuCircle,
  LuHand,
  LuPentagon,
  LuPenTool,
  LuPencilLine,
  LuRectangleHorizontal,
  LuStar,
  LuZoomIn,
  LuZoomOut,
} from 'react-icons/lu'
import {lineSeg, mousePointer} from '../../assets/svg/icons.tsx'
import {useTranslation} from 'react-i18next'
import {
  CHROME_ICON_SIZE,
  CHROME_ICON_TEXT_CLASS,
  CHROME_ICON_ITEM_ACTIVE_CLASS,
  CHROME_ICON_ITEM_CLASS,
  CHROME_RAIL_ITEM_CONTAINER_CLASS,
} from '../editorChrome/chromeIconStyles.ts'

const toolList = [
  {
    labelKey: 'toolbar.selector',
    icon: mousePointer(false, CHROME_ICON_SIZE),
    toolName: 'selector',
  },
  {
    labelKey: 'toolbar.directSelector',
    icon: mousePointer(true, CHROME_ICON_SIZE),
    toolName: 'dselector',
  },
  {
    labelKey: 'toolbar.lineSegment',
    icon: lineSeg(CHROME_ICON_SIZE),
    toolName: 'lineSegment',
  },
  {
    labelKey: 'toolbar.rectangle',
    icon: <LuRectangleHorizontal size={CHROME_ICON_SIZE}/>,
    toolName: 'rectangle',
  },
  {
    labelKey: 'toolbar.ellipse',
    icon: <LuCircle size={CHROME_ICON_SIZE}/>,
    toolName: 'ellipse',
  },
  {
    labelKey: 'toolbar.polygon',
    icon: <LuPentagon size={CHROME_ICON_SIZE}/>,
    toolName: 'polygon',
  },
  {
    labelKey: 'toolbar.star',
    icon: <LuStar size={CHROME_ICON_SIZE}/>,
    toolName: 'star',
  },
  {
    labelKey: 'toolbar.text',
    icon: <span className={CHROME_ICON_TEXT_CLASS}>T</span>,
    toolName: 'text',
  },
  {
    labelKey: 'toolbar.path',
    icon: <LuPenTool size={CHROME_ICON_SIZE}/>,
    toolName: 'path',
  },
  {
    labelKey: 'toolbar.pencil',
    icon: <LuPencilLine size={CHROME_ICON_SIZE}/>,
    toolName: 'pencil',
  },
  {
    labelKey: 'toolbar.hand',
    icon: <LuHand size={CHROME_ICON_SIZE}/>,
    toolName: 'panning',
  },
  {
    labelKey: 'toolbar.zoomIn',
    icon: <LuZoomIn size={CHROME_ICON_SIZE}/>,
    toolName: 'zoomIn',
  },
  {
    labelKey: 'toolbar.zoomOut',
    icon: <LuZoomOut size={CHROME_ICON_SIZE}/>,
    toolName: 'zoomOut',
  },
] as const

const Toolbar: React.FC<{ tool: ToolName, setTool: (t: ToolName) => void }> = ({tool, setTool}) => {
  const {t} = useTranslation()

  const handleToolKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, toolName: ToolName) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setTool(toolName)
    }
  }

  return <aside className={'relative flex h-full w-12 shrink-0 flex-col items-center gap-1 border-r border-slate-200 bg-slate-50 py-2 dark:border-slate-800 dark:bg-slate-950'}>
    {
      toolList.map(({toolName, labelKey, icon}) => {
        const active = toolName === tool
        const label = t(`ui.${labelKey}`)
        return <Tooltip placement={'r'} title={label} key={labelKey}>
          <div className={CHROME_RAIL_ITEM_CONTAINER_CLASS}>
            <div
              role="button"
              tabIndex={0}
              aria-label={label}
              aria-pressed={active}
              className={cn(
                CHROME_ICON_ITEM_CLASS,
                'cursor-pointer',
                active && CHROME_ICON_ITEM_ACTIVE_CLASS,
              )}
              style={{
                outline: 'none',
              }}
              onClick={() => {
                setTool(toolName)
              }}
              onKeyDown={(event) => handleToolKeyDown(event, toolName)}
            >
              {icon}
            </div>
          </div>
        </Tooltip>

      })
    }
  </aside>
}

export default Toolbar
