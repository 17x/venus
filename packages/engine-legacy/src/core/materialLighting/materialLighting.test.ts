import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveEngineDrawCommandShadingBinding } from './materialLighting.ts'
import type { EngineLayeredRenderInput } from '../types.ts'

/**
 * Creates one minimal layered render input fixture for material/lighting binding tests.
 * @param overrides Optional partial overrides applied on the fixture.
 */
function createInputFixture(
  overrides: Partial<EngineLayeredRenderInput> = {},
): EngineLayeredRenderInput {
  return {
    scene: {
      revision: 'phase-e-test',
      width: 100,
      height: 100,
      nodes: [],
      materialRegistry: {
        materialsById: {
          'mat-lit': {
            id: 'mat-lit',
            shadingModel: 'lit',
            surface: {
              baseColor: '#ff0000',
              opacity: 0.8,
            },
          },
        },
      },
      lightingRig: {
        lights: [{
          id: 'sun-1',
          type: 'directional',
          directionX: 0,
          directionY: -1,
          directionZ: 0,
          intensity: 1,
        }],
      },
    },
    camera: {
      viewportWidth: 100,
      viewportHeight: 100,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
      inverseMatrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    },
    interaction: {},
    ...overrides,
  }
}

test('material/lighting resolver keeps 2D shape nodes unlit by default', () => {
  const binding = resolveEngineDrawCommandShadingBinding({
    type: 'shape',
    fill: '#00ff00',
  }, createInputFixture())

  assert.equal(binding.material.shadingModel, 'unlit')
  assert.equal(binding.material.baseColor, '#00ff00')
  assert.deepEqual(binding.lighting, {mode: 'none'})
})

test('material/lighting resolver promotes non-text 3D nodes to lit by default', () => {
  const binding = resolveEngineDrawCommandShadingBinding({
    type: 'image',
  }, createInputFixture({
    camera: {
      viewportWidth: 100,
      viewportHeight: 100,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
      inverseMatrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
      dimensionMode: '3d',
    },
  }))

  assert.equal(binding.material.shadingModel, 'lit')
  assert.equal(binding.lighting.mode, 'scene-lights')
  assert.deepEqual(binding.lighting.activeLightIds, ['sun-1'])
})

test('material/lighting resolver honors scene material registry binding', () => {
  const binding = resolveEngineDrawCommandShadingBinding({
    type: 'shape',
    materialId: 'mat-lit',
  }, createInputFixture())

  assert.equal(binding.material.materialId, 'mat-lit')
  assert.equal(binding.material.shadingModel, 'lit')
  assert.equal(binding.material.baseColor, '#ff0000')
  assert.equal(binding.material.opacity, 0.8)
  assert.equal(binding.lighting.mode, 'scene-lights')
})
