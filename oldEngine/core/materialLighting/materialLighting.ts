import type { EngineDimensionMode } from '../../math/dimension/types.ts'
import type { EngineMaterialBinding, EngineMaterialShadingModel } from '../../material/contracts.ts'
import type { EngineLightDefinition, EngineLightingBinding } from '../../lighting/contracts.ts'
import type { EngineLayeredRenderInput } from '../types.ts'

/**
 * Declares one resolved material+lighting binding payload for draw commands.
 */
export interface EngineDrawCommandShadingBinding {
  /** Effective material binding resolved for the draw command. */
  material: EngineMaterialBinding
  /** Effective lighting binding resolved for the draw command. */
  lighting: EngineLightingBinding
}

/**
 * Resolves one draw-command shading binding from node and layered render input.
 * @param node Node payload for material/lighting binding resolution.
 * @param input Layered render input carrying scene-level material/lighting registries.
 */
export function resolveEngineDrawCommandShadingBinding(
  node: {
    type: 'shape' | 'text' | 'image'
    fill?: string
    style?: {fill?: string}
    opacity?: number
    materialId?: string
    lightingMode?: 'inherit' | 'unlit' | 'lit'
  },
  input: EngineLayeredRenderInput,
): EngineDrawCommandShadingBinding {
  const material = resolveMaterialBinding(node, input)
  const lighting = resolveLightingBinding(material.shadingModel, input.scene.lightingRig)
  return {
    material,
    lighting,
  }
}

/**
 * Resolves one effective material binding for draw-command generation.
 * @param node Node payload for material binding resolution.
 * @param input Layered render input carrying material registry and camera mode.
 */
function resolveMaterialBinding(
  node: {
    type: 'shape' | 'text' | 'image'
    fill?: string
    style?: {fill?: string}
    opacity?: number
    materialId?: string
    lightingMode?: 'inherit' | 'unlit' | 'lit'
  },
  input: EngineLayeredRenderInput,
): EngineMaterialBinding {
  const materialDefinition = node.materialId
    ? input.scene.materialRegistry?.materialsById[node.materialId]
    : undefined
  const dimensionMode: EngineDimensionMode = input.camera.dimensionMode ?? '2d'

  const shadingModel = resolveShadingModel(
    node,
    dimensionMode,
    materialDefinition?.shadingModel,
  )

  return {
    materialId: materialDefinition?.id ?? node.materialId,
    shadingModel,
    baseColor: materialDefinition?.surface?.baseColor
      ?? resolveNodeBaseColor(node),
    opacity: materialDefinition?.surface?.opacity
      ?? node.opacity,
  }
}

/**
 * Resolves one effective shading model for the draw command.
 * @param node Node payload carrying optional lighting override mode.
 * @param dimensionMode Camera dimension mode.
 * @param materialShadingModel Optional shading model from material registry.
 */
function resolveShadingModel(
  node: {type: 'shape' | 'text' | 'image'; lightingMode?: 'inherit' | 'unlit' | 'lit'},
  dimensionMode: EngineDimensionMode,
  materialShadingModel: EngineMaterialShadingModel | undefined,
): EngineMaterialShadingModel {
  if (node.lightingMode === 'unlit') {
    return 'unlit'
  }

  if (node.lightingMode === 'lit') {
    return 'lit'
  }

  if (materialShadingModel) {
    return materialShadingModel
  }

  if (dimensionMode === '3d' && node.type !== 'text') {
    return 'lit'
  }

  return 'unlit'
}

/**
 * Resolves one node-local base color fallback for baseline material bindings.
 * @param node Node payload for color fallback resolution.
 */
function resolveNodeBaseColor(
  node: {type: 'shape' | 'text' | 'image'; fill?: string; style?: {fill?: string}},
): string | undefined {
  if (node.type === 'text') {
    return node.style?.fill
  }

  if (node.type === 'shape') {
    return node.fill
  }

  return undefined
}

/**
 * Resolves one lighting binding from effective shading model and scene lighting rig.
 * @param shadingModel Effective shading model of the draw command.
 * @param lightingRig Optional scene-level lighting rig.
 */
function resolveLightingBinding(
  shadingModel: EngineMaterialShadingModel,
  lightingRig: {lights: readonly EngineLightDefinition[]} | undefined,
): EngineLightingBinding {
  if (shadingModel !== 'lit') {
    return {mode: 'none'}
  }

  const lights = lightingRig?.lights ?? []
  if (lights.length === 0) {
    return {mode: 'none'}
  }

  return {
    mode: 'scene-lights',
    activeLightIds: lights.map((light) => light.id),
  }
}
