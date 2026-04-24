import {type ToolName} from '@venus/document-core'
import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tooltip,
} from '@vector/ui'
import {
  LuChevronUp,
  LuCircle,
  LuImage,
  LuMousePointer2,
  LuMoveUpRight,
  LuPencil,
  LuPenTool,
  LuRectangleHorizontal,
  LuSpline,
  LuStar,
  LuType,
  LuHand,
  LuBetweenHorizontalStart,
} from 'react-icons/lu'
import {useTranslation} from 'react-i18next'
import type {ShellCommandMeta} from '../../editor/shell/commands/shellCommandRegistry.ts'

interface ToolbeltProps {
  currentTool: ToolName
  onSelectTool: (tool: ToolName, meta: ShellCommandMeta) => void
}

type ToolbarTool = {
  id: string
  tool?: ToolName
  label: string
  icon: React.ReactNode
  disabled?: boolean
}

function resolveActiveTool(tools: ToolbarTool[], currentTool: ToolName) {
  const activeTool = tools.find((item) => item.tool === currentTool)
  if (activeTool) {
    return activeTool
  }

  return tools[0]
}

function ToolGroupButton(props: {
  title: string
  active?: boolean
  currentIcon: React.ReactNode
  selectedTool?: ToolName
  tools: ToolbarTool[]
  onSelectTool: (tool: ToolName, sourceControl: string) => void
}) {
  const active = Boolean(props.active)

  return (
    <div className={'inline-flex items-center overflow-hidden rounded-md bg-white dark:bg-slate-900'}>
      <Tooltip placement={'t'} title={props.title} asChild>
        <Button
          type={'button'}
          noTooltip
          aria-label={props.title}
          title={props.title}
          className={cn(
            'inline-flex h-8 items-center justify-center gap-0.5 rounded-none border-0 bg-transparent px-2 text-slate-700 outline-none transition-colors',
            'hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-300',
            'dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-slate-50 dark:focus-visible:ring-slate-600',
            active && 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50',
          )}
          onClick={() => {
            if (props.selectedTool) {
              props.onSelectTool(props.selectedTool, `group-${props.selectedTool}-quick`)
            }
          }}
        >
          <span className={'inline-flex items-center'}>{props.currentIcon}</span>
        </Button>
      </Tooltip>

      <DropdownMenu>
        <Tooltip placement={'t'} title={props.title} asChild>
          <DropdownMenuTrigger
            aria-label={props.title + ' menu'}
            title={props.title + ' menu'}
            className={cn(
              'inline-flex h-8 items-center justify-center rounded-none border-0 bg-transparent px-1 text-slate-700 outline-none transition-colors dark:text-slate-200',
              'hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50 dark:focus-visible:ring-slate-600',
              active && 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50',
            )}
          >
            <LuChevronUp size={12} className={'opacity-70'}/>
          </DropdownMenuTrigger>
        </Tooltip>

        <DropdownMenuContent side={'top'} align={'center'} sideOffset={8} className={'min-w-44'}>
          {props.tools.map((tool) => {
            return <DropdownMenuItem
              key={tool.id}
              disabled={tool.disabled || !tool.tool}
              title={tool.label}
              className={'text-[12px] leading-[18px]'}
              onClick={() => {
                if (tool.tool) {
                  props.onSelectTool(tool.tool, `group-${tool.id}`)
                }
              }}
            >
              <span className={'inline-flex items-center gap-2'}>
                <span className={'inline-flex opacity-80'}>{tool.icon}</span>
                <span>{tool.label}</span>
              </span>
            </DropdownMenuItem>
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default function Toolbelt(props: ToolbeltProps) {
  const {currentTool, onSelectTool} = props
  const {t} = useTranslation()

  const selectTools: ToolbarTool[] = [
    {
      id: 'selector',
      tool: 'selector',
      label: t('ui.toolbar.selector', {defaultValue: 'Selector'}),
      icon: <LuMousePointer2 size={16}/>,
    },
    {
      id: 'hand',
      tool: 'panning',
      label: t('ui.toolbar.hand', {defaultValue: 'Hand'}),
      icon: <LuHand size={16}/>,
    },
  ]

  const shapeTools: ToolbarTool[] = [
    {
      id: 'rectangle',
      tool: 'rectangle',
      label: t('ui.toolbar.rectangle', {defaultValue: 'Rectangle'}),
      icon: <LuRectangleHorizontal size={16}/>,
    },
    {
      id: 'lineSegment',
      tool: 'lineSegment',
      label: t('ui.toolbar.lineSegment', {defaultValue: 'Line Segment'}),
      icon: <LuBetweenHorizontalStart size={16}/>,
    },
    {
      id: 'connector',
      tool: 'connector',
      label: t('ui.toolbar.connector', {defaultValue: 'Connector'}),
      icon: <LuMoveUpRight size={16}/>,
    },
    {
      id: 'ellipse',
      tool: 'ellipse',
      label: t('ui.toolbar.ellipse', {defaultValue: 'Ellipse'}),
      icon: <LuCircle size={16}/>,
    },
    {
      id: 'polygon',
      tool: 'polygon',
      label: t('ui.toolbar.polygon', {defaultValue: 'Polygon'}),
      icon: <LuSpline size={16}/>,
    },
    {
      id: 'star',
      tool: 'star',
      label: t('ui.toolbar.star', {defaultValue: 'Star'}),
      icon: <LuStar size={16}/>,
    },
    {
      id: 'image',
      label: t('toolbar.image', {defaultValue: 'Image'}),
      icon: <LuImage size={16}/>,
      disabled: true,
    },
  ]

  const penTools: ToolbarTool[] = [
    {
      id: 'path',
      tool: 'path',
      label: t('ui.toolbar.path', {defaultValue: 'Pen'}),
      icon: <LuPenTool size={16}/>,
    },
    {
      id: 'pencil',
      tool: 'pencil',
      label: t('ui.toolbar.pencil', {defaultValue: 'Pencil'}),
      icon: <LuPencil size={16}/>,
    },
  ]

  const textTool: ToolbarTool = {
    id: 'text',
    tool: 'text',
    label: t('ui.toolbar.text', {defaultValue: 'Text'}),
    icon: <LuType size={16}/>,
  }

  const activeSelectTool = resolveActiveTool(selectTools, currentTool)
  const activeShapeTool = resolveActiveTool(shapeTools, currentTool)
  const activePenTool = resolveActiveTool(penTools, currentTool)

  const selectToolByGroup = (tool: ToolName, sourceControl: string) => {
    onSelectTool(tool, {
      sourcePanel: 'toolbelt',
      sourceControl,
      commitType: 'final',
    })
  }

  return (
    <div
      className={'pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2'}
      aria-label={'Application toolbar'}
    >
      <div className={'pointer-events-auto flex items-center gap-2 rounded-xl bg-white/90 px-2 py-1 backdrop-blur dark:bg-slate-900/90'}>
        <div className={'flex items-center gap-1'}>
          <ToolGroupButton
            title={t('toolbelt.moveTools', {defaultValue: 'Select / Hand tools'})}
            active={selectTools.some((item) => item.tool === currentTool)}
            currentIcon={activeSelectTool?.icon ?? <LuMousePointer2 size={16}/>}
            selectedTool={activeSelectTool?.tool}
            tools={selectTools}
            onSelectTool={selectToolByGroup}
          />

          <ToolGroupButton
            title={t('toolbelt.shapeTools', {defaultValue: 'Shape tools'})}
            active={shapeTools.some((item) => item.tool === currentTool)}
            currentIcon={activeShapeTool?.icon ?? <LuRectangleHorizontal size={16}/>}
            selectedTool={activeShapeTool?.tool}
            tools={shapeTools}
            onSelectTool={selectToolByGroup}
          />

          <ToolGroupButton
            title={t('toolbelt.creationTools', {defaultValue: 'Pen / Pencil tools'})}
            active={penTools.some((item) => item.tool === currentTool)}
            currentIcon={activePenTool?.icon ?? <LuPenTool size={16}/>}
            selectedTool={activePenTool?.tool}
            tools={penTools}
            onSelectTool={selectToolByGroup}
          />

          <Tooltip placement={'t'} title={textTool.label}>
            <Button
              type={'button'}
              noTooltip
              aria-label={textTool.label}
              title={textTool.label}
              className={cn(
                'inline-flex h-8 items-center justify-center rounded bg-transparent px-2 text-slate-700 outline-none transition-colors',
                'hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-300',
                'dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-slate-50 dark:focus-visible:ring-slate-600',
                currentTool === 'text' && 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50',
              )}
              onClick={() => {
                selectToolByGroup('text', 'group-text')
              }}
            >
              {textTool.icon}
            </Button>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}
