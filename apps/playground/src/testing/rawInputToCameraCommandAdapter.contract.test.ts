import assert from 'node:assert/strict'
import test from 'node:test'
import type {EngineCameraCommand} from '@venus/engine'
import {createRawInputToCameraCommandAdapter} from '../runtime/threeEditor/rawInputToCameraCommandAdapter'

function createHarness(isActive = true) {
  const commands: EngineCameraCommand[] = []
  const commits: Array<{didDrag: boolean}> = []
  const adapter = createRawInputToCameraCommandAdapter({
    isActive: () => isActive,
    onCommand: (command) => {
      commands.push(command)
    },
    onHoverMoved: async () => undefined,
    onCommitSelection: async (payload) => {
      commits.push({didDrag: payload.didDrag})
    },
  })
  const mousePointer = {
    pointerId: 1,
    pointerType: 'mouse',
    button: 0,
    shiftKey: false,
    ctrlKey: false,
    metaKey: false,
  }
  return {adapter, commands, commits, mousePointer}
}

function lastOrbitCommand(commands: readonly EngineCameraCommand[]) {
  const command = commands[commands.length - 1]
  assert.ok(command, 'expected a camera command')
  assert.equal(command.type, 'orbit')
  return command
}

test('mouse left drag emits orbit yaw signs for editor side-view intent', () => {
  const rightDragHarness = createHarness()
  assert.equal(rightDragHarness.adapter.handlePointerDown({x: 100, y: 100}, rightDragHarness.mousePointer), true)
  assert.equal(rightDragHarness.adapter.handlePointerMove({x: 130, y: 100}, rightDragHarness.mousePointer), true)
  const rightDragCommand = lastOrbitCommand(rightDragHarness.commands)
  assert.equal(rightDragCommand.deltaYaw > 0, true, 'drag right should increase yaw toward object left side')
  assert.equal(Math.abs(rightDragCommand.deltaPitch), 0)

  const leftDragHarness = createHarness()
  assert.equal(leftDragHarness.adapter.handlePointerDown({x: 100, y: 100}, leftDragHarness.mousePointer), true)
  assert.equal(leftDragHarness.adapter.handlePointerMove({x: 70, y: 100}, leftDragHarness.mousePointer), true)
  const leftDragCommand = lastOrbitCommand(leftDragHarness.commands)
  assert.equal(leftDragCommand.deltaYaw < 0, true, 'drag left should decrease yaw toward object right side')
  assert.equal(Math.abs(leftDragCommand.deltaPitch), 0)
})

test('mouse vertical drag emits orbit pitch signs for over-under target intent', () => {
  const upwardDragHarness = createHarness()
  assert.equal(upwardDragHarness.adapter.handlePointerDown({x: 100, y: 100}, upwardDragHarness.mousePointer), true)
  assert.equal(upwardDragHarness.adapter.handlePointerMove({x: 100, y: 70}, upwardDragHarness.mousePointer), true)
  const upwardDragCommand = lastOrbitCommand(upwardDragHarness.commands)
  assert.equal(Math.abs(upwardDragCommand.deltaYaw), 0)
  assert.equal(upwardDragCommand.deltaPitch > 0, true, 'drag up should increase pitch toward over-target view')

  const downwardDragHarness = createHarness()
  assert.equal(downwardDragHarness.adapter.handlePointerDown({x: 100, y: 100}, downwardDragHarness.mousePointer), true)
  assert.equal(downwardDragHarness.adapter.handlePointerMove({x: 100, y: 130}, downwardDragHarness.mousePointer), true)
  const downwardDragCommand = lastOrbitCommand(downwardDragHarness.commands)
  assert.equal(Math.abs(downwardDragCommand.deltaYaw), 0)
  assert.equal(downwardDragCommand.deltaPitch < 0, true, 'drag down should decrease pitch toward under-target view')
})

test('inactive adapter ignores pointer input without camera commands', () => {
  const inactiveHarness = createHarness(false)
  assert.equal(inactiveHarness.adapter.handlePointerDown({x: 100, y: 100}, inactiveHarness.mousePointer), false)
  assert.equal(inactiveHarness.adapter.handlePointerMove({x: 130, y: 130}, inactiveHarness.mousePointer), false)
  assert.deepEqual(inactiveHarness.commands, [])
})
