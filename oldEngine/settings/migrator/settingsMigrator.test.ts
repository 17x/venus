import test from 'node:test'
import assert from 'node:assert/strict'

import { migrateEngineSettings } from './settingsMigrator.ts'

test('migrateEngineSettings maps legacy fields and emits warnings', () => {
  const migrated = migrateEngineSettings({
    scale: 0.9,
    fpsCap: 75,
    uploadBudget: 123456,
    runtime: {
      retained: true,
      partial: false,
      progressive: true,
    },
  })

  assert.equal(migrated.settings.graphics.renderScale, 0.9)
  assert.equal(migrated.settings.graphics.maxFps, 75)
  assert.equal(migrated.settings.performance.uploadBudgetBytes, 123456)
  assert.equal(migrated.settings.runtime.partialRedraw, false)
  assert.equal(migrated.warnings.length, 3)
})
