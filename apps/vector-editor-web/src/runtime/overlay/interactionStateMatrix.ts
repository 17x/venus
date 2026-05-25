import {type CursorIntent} from '@venus/editor-primitive'
import type {EngineOverlayDrawNode} from '../engine-bridge/engine.ts'
import {
  createEngineOverlayNodesFromSelectorItems,
  createSelectorOverlayItems,
} from './selectorOverlayAdapter.ts'
import type {RuntimeOverlayInstruction} from './index.ts'

/**
 * Declares one interaction state id used by matrix-driven overlay generation.
 */
export type RuntimeInteractionStateMatrixState =
  | 'hover'
  | 'marquee'
  | 'selected'
  | 'handles'
  | 'cursor'

/**
 * Declares one world-space bounds payload used by matrix instruction builders.
 */
export interface RuntimeInteractionStateMatrixBounds {
  /** Stores minimum x in world coordinates. */
  minX: number
  /** Stores minimum y in world coordinates. */
  minY: number
  /** Stores maximum x in world coordinates. */
  maxX: number
  /** Stores maximum y in world coordinates. */
  maxY: number
}

/**
 * Declares matrix input contract used to generate overlay instructions and nodes.
 */
export interface RuntimeInteractionStateMatrixInput {
  /** Stores state list to materialize in the output overlay set. */
  states: readonly RuntimeInteractionStateMatrixState[]
  /** Stores canonical world bounds used by bounds-driven states. */
  bounds: RuntimeInteractionStateMatrixBounds
  /** Stores optional cursor intent used by cursor-state overlays. */
  cursorIntent?: CursorIntent
}

/**
 * Declares one matrix output payload with both runtime instructions and engine draw nodes.
 */
export interface RuntimeInteractionStateMatrixOutput {
  /** Stores deterministic runtime overlay instruction list for selected states. */
  instructions: RuntimeOverlayInstruction[]
  /** Stores deterministic engine overlay nodes adapted from the matrix instructions. */
  engineOverlayNodes: EngineOverlayDrawNode[]
}

/**
 * Resolves one deterministic interaction-state matrix output for overlay routing tests.
 * @param input Matrix input containing state set, bounds, and optional cursor intent.
 */
export function createRuntimeInteractionStateMatrixOutput(
  input: RuntimeInteractionStateMatrixInput,
): RuntimeInteractionStateMatrixOutput {
  const instructions = createRuntimeInteractionStateMatrixInstructions(input)
  const selectorItems = createSelectorOverlayItems(instructions)
  const engineOverlayNodes = createEngineOverlayNodesFromSelectorItems(selectorItems, 'world')

  return {
    instructions,
    engineOverlayNodes,
  }
}

/**
 * Resolves one deterministic instruction list for the requested interaction-state set.
 * @param input Matrix input containing state set, bounds, and optional cursor intent.
 */
export function createRuntimeInteractionStateMatrixInstructions(
  input: RuntimeInteractionStateMatrixInput,
): RuntimeOverlayInstruction[] {
  const activeStateSet = new Set(input.states)
  const instructions: RuntimeOverlayInstruction[] = []

  if (activeStateSet.has('selected')) {
    instructions.push({
      id: 'state-matrix:selected',
      layerId: 'overlay.selection',
      primitive: 'polyline',
      coordinate: 'world',
      points: toRectPolyline(input.bounds),
      style: {
        strokeColor: '#2563eb',
        strokeWidth: 1.5,
      },
      cursor: {type: 'move'},
    })
  }

  if (activeStateSet.has('hover')) {
    instructions.push({
      id: 'state-matrix:hover',
      layerId: 'overlay.hover',
      primitive: 'polyline',
      coordinate: 'world',
      points: toRectPolyline(expandBounds(input.bounds, 6)),
      style: {
        strokeColor: 'rgba(14,165,233,0.95)',
        strokeWidth: 1,
      },
      cursor: {type: 'pointer'},
    })
  }

  if (activeStateSet.has('marquee')) {
    instructions.push({
      id: 'state-matrix:marquee',
      layerId: 'overlay.marquee',
      primitive: 'polyline',
      coordinate: 'world',
      points: toRectPolyline(expandBounds(input.bounds, 20)),
      style: {
        strokeColor: 'rgba(37,99,235,0.95)',
        strokeWidth: 1,
        strokeDash: [4, 4],
        fillColor: 'rgba(37,99,235,0.08)',
      },
      cursor: {type: 'crosshair'},
    })
  }

  if (activeStateSet.has('handles')) {
    const handlePoints = toHandlePoints(input.bounds)
    handlePoints.forEach((point, index) => {
      instructions.push({
        id: `state-matrix:handle:${index}`,
        layerId: 'overlay.handles',
        primitive: 'circle',
        coordinate: 'world',
        points: [point],
        style: {
          strokeColor: '#0f172a',
          fillColor: '#ffffff',
          strokeWidth: 1,
          pointRadius: 4,
        },
      })
    })
  }

  if (activeStateSet.has('cursor')) {
    instructions.push({
      id: 'state-matrix:cursor',
      layerId: 'overlay.guides',
      primitive: 'line',
      coordinate: 'world',
      points: [
        {x: input.bounds.minX, y: input.bounds.minY},
        {x: input.bounds.maxX, y: input.bounds.maxY},
      ],
      style: {
        strokeColor: 'rgba(15,23,42,0.5)',
        strokeWidth: 1,
        strokeDash: [2, 3],
      },
      cursor: input.cursorIntent ?? {type: 'move'},
    })
  }

  return instructions
}

/**
 * Converts one bounds payload to a closed rect polyline.
 * @param bounds Input bounds payload.
 */
function toRectPolyline(bounds: RuntimeInteractionStateMatrixBounds): Array<{x: number; y: number}> {
  return [
    {x: bounds.minX, y: bounds.minY},
    {x: bounds.maxX, y: bounds.minY},
    {x: bounds.maxX, y: bounds.maxY},
    {x: bounds.minX, y: bounds.maxY},
    {x: bounds.minX, y: bounds.minY},
  ]
}

/**
 * Resolves one expanded bounds payload using a symmetric margin.
 * @param bounds Input bounds payload.
 * @param margin Expansion margin in world units.
 */
function expandBounds(
  bounds: RuntimeInteractionStateMatrixBounds,
  margin: number,
): RuntimeInteractionStateMatrixBounds {
  return {
    minX: bounds.minX - margin,
    minY: bounds.minY - margin,
    maxX: bounds.maxX + margin,
    maxY: bounds.maxY + margin,
  }
}

/**
 * Resolves canonical corner and edge handle points for handle-state overlays.
 * @param bounds Input bounds payload.
 */
function toHandlePoints(bounds: RuntimeInteractionStateMatrixBounds): Array<{x: number; y: number}> {
  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerY = (bounds.minY + bounds.maxY) / 2

  return [
    {x: bounds.minX, y: bounds.minY},
    {x: centerX, y: bounds.minY},
    {x: bounds.maxX, y: bounds.minY},
    {x: bounds.maxX, y: centerY},
    {x: bounds.maxX, y: bounds.maxY},
    {x: centerX, y: bounds.maxY},
    {x: bounds.minX, y: bounds.maxY},
    {x: bounds.minX, y: centerY},
  ]
}
