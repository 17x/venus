import type {ToolName} from '../../runtime/model/index.ts'
import SHORTCUTS_DATA, {type ActionItemType} from '../actions.ts'
import matchObject from '../find.ts'
import deepClone from '../deepClone.ts'

/**
 * Builds normalized shortcut definition list used by shortcut runtime adapter.
 */
export function buildShortcutActions(): ActionItemType[] {
  const actions = matchObject(
    deepClone(SHORTCUTS_DATA),
    (item) => !!item.shortcut,
  ) as ActionItemType[]

  // Inject transient toggle tool shortcut used for hold-space pan behavior.
  actions.push({
    id: 'toggleTool',
    shortcut: 'space',
  })

  return actions
}

/**
 * Resolves switch-tool payload into safe ToolName fallback.
 */
export function resolveSwitchToolName(value: unknown): ToolName {
  return (typeof value === 'string' && value.length > 0 ? value : 'selector') as ToolName
}
