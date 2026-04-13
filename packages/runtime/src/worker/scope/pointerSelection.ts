import type {SceneSelectionMode} from '@venus/shared-memory'

export function resolvePointerSelectionMode(
  modifiers?: {shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean; altKey?: boolean},
): SceneSelectionMode {
  if (modifiers?.altKey) {
    return 'remove'
  }

  if (modifiers?.shiftKey) {
    return 'add'
  }

  if (modifiers?.metaKey || modifiers?.ctrlKey) {
    return 'toggle'
  }

  return 'replace'
}
