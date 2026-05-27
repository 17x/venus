/**
 * Template generator registry and public entry-point.
 *
 * This file owns only the PRESET_GENERATORS map and the `generateTemplateFile`
 * dispatch function. All generator implementations live in focused sibling
 * modules:
 *   - generators.demos.ts         — demo presets (basic shapes, welcome board)
 *   - generators.matrix.ts        — feature-matrix regression preset
 *   - generators.stress.ts        — large mixed / image-heavy / text-dense presets
 *   - generators.wireframe.ts     — wireframe demo preset
 */
import type {EditorFileDocument} from '../../types/index.ts'
import {getTemplatePresetById} from '../presets.ts'
import type {TemplateFileGenerator, TemplateGeneratorContext} from '../types.ts'
import {createBasicShapesDemo, createWelcomeBoardDemo, createModelCoverageDemo} from './generators.demos.ts'
import {createFeatureMatrixTemplate} from './generators.matrix.ts'
import {
  createImageHeavyTemplate,
  createLargeMixedTemplate,
  createTextDenseTemplate,
} from './generators.stress.ts'
import {createWireframeDemo} from './generators.wireframe.ts'

/** Maps preset IDs to their generator functions. */
const PRESET_GENERATORS: Record<string, TemplateFileGenerator> = {
  'demo-basic-shapes': createBasicShapesDemo,
  'demo-welcome-board': createWelcomeBoardDemo,
  'demo-model-coverage': createModelCoverageDemo,
  'demo-wireframe': createWireframeDemo,
  'test-feature-matrix': createFeatureMatrixTemplate,
  'test-text-dense': createTextDenseTemplate,
  'test-deep-groups': createLargeMixedTemplate,
  'test-overlap-heavy': createLargeMixedTemplate,
  'mixed-10k': createLargeMixedTemplate,
  'mixed-50k': createLargeMixedTemplate,
  'mixed-100k': createLargeMixedTemplate,
  'mixed-200k': createLargeMixedTemplate,
  'mixed-300k': createLargeMixedTemplate,
  'test-sparse-large': createLargeMixedTemplate,
  'test-transform-batch': createLargeMixedTemplate,
  'images-1k': createImageHeavyTemplate,
  'images-10k': createImageHeavyTemplate,
  'images-50k': createImageHeavyTemplate,
  'text-10k': createTextDenseTemplate,
}

export function generateTemplateFile(
  presetId: string,
  context: TemplateGeneratorContext = {},
): EditorFileDocument {
  const preset = getTemplatePresetById(presetId)
  if (!preset) {
    throw new Error(`template preset not found: ${presetId}`)
  }

  const generator = PRESET_GENERATORS[preset.id]
  if (!generator) {
    throw new Error(`template generator missing: ${preset.id}`)
  }

  return generator(preset, context)
}
