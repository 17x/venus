import assert from 'node:assert/strict'
import {
  createDefaultShellLayoutState,
  deserializeShellLayoutState,
  serializeShellLayoutState,
} from '../state/shellState.ts'

export function runShellStateSelfCheck() {
  const defaults = createDefaultShellLayoutState()

  const serialized = serializeShellLayoutState(defaults)
  const parsed = deserializeShellLayoutState(serialized)

  assert.equal(parsed.activeInspectorContext, defaults.activeInspectorContext)
  assert.equal(parsed.toolbeltMode, defaults.toolbeltMode)
  assert.deepEqual(parsed.minimizedInspectorPanels, defaults.minimizedInspectorPanels)

  const malformed = deserializeShellLayoutState('{not-valid-json')
  assert.equal(malformed.activeInspectorContext, 'selection')
  assert.equal(malformed.toolbeltMode, 'draw')

  return true
}
