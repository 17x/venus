import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createPluginLifecycleContract,
  resolvePluginLifecycleOrder,
  validatePluginLifecyclePhase,
} from './pluginLifecycleContract'

/**
 * Verifies lifecycle order helper returns canonical deterministic phase sequence.
 */
test('resolvePluginLifecycleOrder returns canonical plugin phase order', () => {
  assert.deepEqual(resolvePluginLifecycleOrder(), [
    'setup',
    'activate',
    'deactivate',
    'dispose',
  ])
})

/**
 * Verifies phase validator accepts only canonical lifecycle phase tokens.
 */
test('validatePluginLifecyclePhase accepts only canonical phase tokens', () => {
  assert.equal(validatePluginLifecyclePhase('setup'), true)
  assert.equal(validatePluginLifecyclePhase('activate'), true)
  assert.equal(validatePluginLifecyclePhase('invalid-phase'), false)
})

/**
 * Verifies lifecycle dispatcher runs hooks in order and becomes terminal after dispose.
 */
test('createPluginLifecycleContract dispatches hooks deterministically and stops after dispose', async () => {
  const callLog: string[] = []
  const contract = createPluginLifecycleContract({
    onSetup: async () => {
      callLog.push('setup')
    },
    onActivate: async () => {
      callLog.push('activate')
    },
    onDeactivate: async () => {
      callLog.push('deactivate')
    },
    onDispose: async () => {
      callLog.push('dispose')
    },
  })

  const context = {
    sessionId: 's1',
    timestampMs: 1,
    capabilities: ['runtime.events'],
  }

  await contract.dispatch('setup', context)
  await contract.dispatch('activate', context)
  await contract.dispatch('deactivate', context)
  await contract.dispatch('dispose', context)
  await contract.dispatch('activate', context)

  assert.deepEqual(callLog, ['setup', 'activate', 'deactivate', 'dispose'])
  assert.deepEqual(contract.getHistory(), ['setup', 'activate', 'deactivate', 'dispose'])
  assert.equal(contract.isDisposed(), true)
})
