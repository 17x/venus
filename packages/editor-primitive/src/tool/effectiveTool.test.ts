import assert from 'node:assert/strict'
import test from 'node:test'

import {createToolRuntime} from './ToolRuntime.ts'
import {applyCurrentTool, applyTemporaryTool, resolveEffectiveTool} from './effectiveTool.ts'

test('tool helpers prioritize temporary tool and support policy override', () => {
  const seeded = createToolRuntime<'select' | 'hand'>('select')
  assert.equal(resolveEffectiveTool(seeded), 'select')

  const withTemporary = applyTemporaryTool(seeded, 'hand')
  assert.equal(withTemporary.effectiveTool, 'hand')

  const withOverride = applyCurrentTool(withTemporary, 'select', {
    resolveOverride: () => 'hand',
  })
  assert.equal(withOverride.effectiveTool, 'hand')
})
