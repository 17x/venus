import assert from 'node:assert/strict'
import test from 'node:test'

import {dispatchToolHandlerEvent, type ToolHandler} from './ToolHandler.ts'

test('dispatchToolHandlerEvent routes pointerdown to matching callback', () => {
  const handler: ToolHandler<{count: number}, {x: number}, string> = {
    onPointerDown: (ctx, event) => `down-${ctx.count}-${event.x}`,
  }

  const value = dispatchToolHandlerEvent(handler, 'pointerdown', {count: 2}, {x: 10})
  assert.equal(value, 'down-2-10')
})

