import assert from 'node:assert/strict'
import test from 'node:test'

import {canUseWebGLBackendExecution, createWebGLBackendExecution} from '../webglBackendExecution'

/**
 * Verifies WebGL probing and staging execution contract behavior.
 */
test('webgl backend execution probe and contract are deterministic', () => {
  assert.equal(
    canUseWebGLBackendExecution({
      canvas: {
        getContext: (type) => (type === 'webgl2' ? {} : null),
      },
    }),
    true,
  )

  const backend = createWebGLBackendExecution()
  const executedCount = backend.executePackets(1, [{id: 'x', kind: 'draw', payload: {}}])
  assert.equal(backend.mode, 'webgl')
  assert.equal(executedCount, 1)
})
