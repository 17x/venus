import assert from 'node:assert/strict'
import test from 'node:test'

import {createAutosaveController} from '../autosave/autosaveController.ts'

test('autosave coalesces pending values and records successful completion', async () => {
  const saved: number[] = []
  const controller = createAutosaveController<number>({
    delayMs: 1_000,
    now: () => 42,
    async save(value) {
      saved.push(value)
    },
  })

  controller.schedule(1)
  controller.schedule(2)
  await controller.flush()

  assert.deepEqual(saved, [2])
  assert.deepEqual(controller.getSnapshot(), {
    status: 'saved',
    lastSavedAt: 42,
    errorMessage: null,
  })
})

test('autosave exposes local write failures without rejecting the editor lifecycle', async () => {
  const controller = createAutosaveController<number>({
    async save() {
      throw new Error('quota exceeded')
    },
  })

  controller.schedule(1)
  await controller.flush()

  assert.equal(controller.getSnapshot().status, 'error')
  assert.equal(controller.getSnapshot().errorMessage, 'quota exceeded')
})
