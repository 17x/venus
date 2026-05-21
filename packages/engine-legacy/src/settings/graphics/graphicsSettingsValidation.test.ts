import test from 'node:test'
import assert from 'node:assert/strict'

import {
  resolveEngineGraphicsSettings,
  validateEngineGraphicsSettings,
} from './graphicsSettings.ts'

test('resolveEngineGraphicsSettings fills defaults', () => {
  const resolved = resolveEngineGraphicsSettings()
  assert.equal(resolved.renderScale, 1)
  assert.equal(resolved.maxFps, 60)
  assert.equal(resolved.antiAliasing, 'fxaa')
})

test('validateEngineGraphicsSettings rejects invalid ranges', () => {
  const issues = validateEngineGraphicsSettings({
    renderScale: 3,
    maxFps: 10,
    antiAliasing: 'off',
  })
  assert.equal(issues.length, 2)
})
