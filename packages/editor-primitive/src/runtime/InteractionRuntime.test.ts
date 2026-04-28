import assert from 'node:assert/strict'
import test from 'node:test'

import type {InteractionRuntime} from './InteractionRuntime'

test('interaction runtime contract supports generic extension points', () => {
  const runtime: InteractionRuntime<'select'> = {
    appMode: {mode: 'normal'},
    pointer: {
      screen: {x: 0, y: 0},
      previousScreen: {x: 0, y: 0},
      deltaScreen: {x: 0, y: 0},
      buttons: 0,
      isDown: false,
      isDragging: false,
      dragDistancePx: 0,
    },
    keyboard: {
      pressedKeys: new Set(),
      modifierKeys: {space: false, alt: false, shift: false, ctrl: false, meta: false},
    },
    tool: {currentTool: 'select', effectiveTool: 'select'},
    viewport: {
      camera: {
        matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
        inverseMatrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
        offsetX: 0,
        offsetY: 0,
        scale: 1,
        viewportWidth: 100,
        viewportHeight: 100,
      },
      isPanning: false,
      isZooming: false,
    },
    hover: {
      screenPoint: {x: 0, y: 0},
      changed: false,
    },
    overlay: {
      version: 0,
      nodes: [],
      dirty: false,
    },
    cursor: {
      intent: {type: 'default'},
      css: 'default',
      source: 'default',
    },
    capture: {
      pointerCaptured: false,
    },
  }

  assert.equal(runtime.tool.currentTool, 'select')
})
