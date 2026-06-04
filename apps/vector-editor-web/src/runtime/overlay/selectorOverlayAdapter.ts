import type {SelectorOverlayItem} from '@venus/editor-primitive'
import type {EngineOverlayDrawNode} from '../engine-bridge/engine.ts'
import type {RuntimeOverlayInstruction} from './index.ts'

/**
 * Adapts runtime overlay instructions into editor-primitive selector overlay descriptors.
 */
export function createSelectorOverlayItems(
  instructions: RuntimeOverlayInstruction[],
): SelectorOverlayItem[] {
  return instructions.map((instruction) => ({
    type: resolveSelectorOverlayType(instruction),
    geometry: {
      primitive: instruction.primitive,
      points: instruction.points ?? [],
    },
    style: {
      stroke: instruction.style?.strokeColor,
      fill: instruction.style?.fillColor,
      dash: instruction.style?.strokeDash,
      width: instruction.style?.strokeWidth,
    },
    zIndex: instruction.style?.zIndex,
  }))
}

/**
 * Adapts selector overlay descriptors into engine overlay nodes for WebGL overlay drawing.
 */
export function createEngineOverlayNodesFromSelectorItems(
  items: SelectorOverlayItem[],
  coordinate: 'world' | 'screen' = 'world',
): EngineOverlayDrawNode[] {
  return items.map((item, index) => ({
    id: `selector-overlay:${index}:${item.type}`,
    type: item.geometry.primitive,
    coordinate,
    points: item.geometry.points,
    style: {
      strokeColor: item.style?.stroke,
      fillColor: item.style?.fill,
      strokeDash: item.style?.dash,
      strokeWidth: item.style?.width,
      zIndex: item.zIndex,
    },
  }))
}

/**
 * Converts runtime overlay instructions directly to engine nodes without
 * dropping handler-specific style fields.
 */
export function createEngineOverlayNodesFromInstructions(
  instructions: RuntimeOverlayInstruction[],
): EngineOverlayDrawNode[] {
  return instructions.map((instruction) => ({
    id: instruction.id,
    type: instruction.primitive,
    coordinate: instruction.coordinate,
    points: instruction.points,
    style: instruction.style ? {...instruction.style} : undefined,
  }))
}

/**
 * Resolves selector overlay semantic type from runtime layer metadata.
 */
function resolveSelectorOverlayType(
  instruction: RuntimeOverlayInstruction,
): SelectorOverlayItem['type'] {
  if (instruction.layerId === 'overlay.marquee') {
    return 'marquee'
  }

  if (instruction.layerId === 'overlay.hover') {
    return 'hoverOutline'
  }

  if (instruction.layerId === 'overlay.selection') {
    return 'selectionBox'
  }

  return 'handler'
}
