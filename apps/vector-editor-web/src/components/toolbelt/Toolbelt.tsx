import {type ToolName} from '@venus/document-core'
import {Button, Tooltip, cn} from '@vector/ui'
import {LuCircle, LuFrame, LuLayers, LuMousePointer2, LuPenTool, LuRectangleHorizontal, LuType} from 'react-icons/lu'
import {useTranslation} from 'react-i18next'
import type {ToolbeltMode} from '../../editor/shell/state/toolbeltState.ts'
import type {ShellCommandMeta} from '../../editor/shell/commands/shellCommandRegistry.ts'

interface ToolbeltProps {
  currentTool: ToolName
  mode: ToolbeltMode
  onSelectTool: (tool: ToolName, meta: ShellCommandMeta) => void
  onSetMode: (mode: ToolbeltMode, meta: ShellCommandMeta) => void
}

const MOVE_TOOLS: ToolName[] = ['selector', 'dselector']
const FRAME_TOOLS: ToolName[] = ['rectangle']
const SHAPE_TOOLS: ToolName[] = ['rectangle', 'ellipse', 'polygon', 'star']
const PEN_TOOLS: ToolName[] = ['path', 'pencil']

function resolveNextTool(options: ToolName[], current: ToolName) {
  const currentIndex = options.indexOf(current)
  if (currentIndex < 0) {
    return options[0]
  }

  return options[(currentIndex + 1) % options.length]
}

function ToolbeltButton(props: {
  active?: boolean
  title: string
  onClick: VoidFunction
  children: React.ReactNode
}) {
  return (
    <Tooltip placement={'t'} title={props.title}>
      <Button
        type={'button'}
        aria-label={props.title}
        aria-pressed={Boolean(props.active)}
        className={cn(
          'venus-shell-focusable inline-flex h-8 items-center justify-center rounded border px-2',
          props.active ? 'border-gray-300 venus-shell-icon-active text-gray-900' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
        )}
        onClick={props.onClick}
      >
        {props.children}
      </Button>
    </Tooltip>
  )
}

export default function Toolbelt(props: ToolbeltProps) {
  const {currentTool, mode, onSelectTool, onSetMode} = props
  const {t} = useTranslation()

  return (
    <div
      className={'pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2'}
      aria-label={'Application toolbar'}
    >
      <div className={'pointer-events-auto flex items-center gap-2 rounded-xl border border-gray-300 bg-white/95 px-2 py-1 shadow-lg backdrop-blur'}>
        <div className={'flex items-center gap-1'}>
          <ToolbeltButton
            active={MOVE_TOOLS.includes(currentTool)}
            title={t('toolbelt.move', {defaultValue: 'Move'})}
            onClick={() => onSelectTool('selector', {
              sourcePanel: 'toolbelt',
              sourceControl: 'move-primary',
              commitType: 'final',
            })}
          >
            <LuMousePointer2 size={16}/>
          </ToolbeltButton>
          <ToolbeltButton
            title={t('toolbelt.moveTools', {defaultValue: 'Move tools'})}
            onClick={() => onSelectTool(resolveNextTool(MOVE_TOOLS, currentTool), {
              sourcePanel: 'toolbelt',
              sourceControl: 'move-chevron',
              commitType: 'final',
            })}
          >
            <LuLayers size={16}/>
          </ToolbeltButton>

          <ToolbeltButton
            active={FRAME_TOOLS.includes(currentTool)}
            title={t('toolbelt.frame', {defaultValue: 'Frame'})}
            onClick={() => onSelectTool('rectangle', {
              sourcePanel: 'toolbelt',
              sourceControl: 'frame-primary',
              commitType: 'final',
            })}
          >
            <LuFrame size={16}/>
          </ToolbeltButton>

          <ToolbeltButton
            active={SHAPE_TOOLS.includes(currentTool)}
            title={t('toolbelt.rectangle', {defaultValue: 'Rectangle'})}
            onClick={() => onSelectTool('rectangle', {
              sourcePanel: 'toolbelt',
              sourceControl: 'shape-primary',
              commitType: 'final',
            })}
          >
            <LuRectangleHorizontal size={16}/>
          </ToolbeltButton>
          <ToolbeltButton
            title={t('toolbelt.shapeTools', {defaultValue: 'Shape tools'})}
            onClick={() => onSelectTool(resolveNextTool(SHAPE_TOOLS, currentTool), {
              sourcePanel: 'toolbelt',
              sourceControl: 'shape-chevron',
              commitType: 'final',
            })}
          >
            <LuCircle size={16}/>
          </ToolbeltButton>

          <ToolbeltButton
            active={PEN_TOOLS.includes(currentTool)}
            title={t('toolbelt.pen', {defaultValue: 'Pen'})}
            onClick={() => onSelectTool('path', {
              sourcePanel: 'toolbelt',
              sourceControl: 'pen-primary',
              commitType: 'final',
            })}
          >
            <LuPenTool size={16}/>
          </ToolbeltButton>
          <ToolbeltButton
            title={t('toolbelt.creationTools', {defaultValue: 'Creation tools'})}
            onClick={() => onSelectTool(resolveNextTool(PEN_TOOLS, currentTool), {
              sourcePanel: 'toolbelt',
              sourceControl: 'pen-chevron',
              commitType: 'final',
            })}
          >
            <LuType size={16}/>
          </ToolbeltButton>
        </div>

        <div className={'mx-1 h-6 w-px bg-gray-200'}></div>

        <div className={'flex items-center gap-1'} role={'radiogroup'} aria-label={'Toolbelt Mode'}>
          {(['draw', 'design', 'handoff'] as const).map((nextMode) => {
            const active = nextMode === mode
            return (
              <Button
                key={nextMode}
                type={'button'}
                role={'radio'}
                aria-checked={active}
                className={cn(
                  'inline-flex h-8 rounded px-2 capitalize',
                  active ? 'venus-shell-icon-active text-gray-900' : 'bg-white text-gray-700 hover:bg-gray-50',
                )}
                onClick={() => {
                  onSetMode(nextMode, {
                    sourcePanel: 'toolbelt',
                    sourceControl: `mode-${nextMode}`,
                    commitType: 'final',
                  })
                }}
              >
                {nextMode}
              </Button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
