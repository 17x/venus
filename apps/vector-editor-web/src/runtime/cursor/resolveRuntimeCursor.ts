import type {RuntimeEditingMode} from '../editing-modes/index.ts'
import {
  resolveCursorRuntime,
  type CursorIntent,
  type CursorRuntime,
} from '@venus/editor-primitive'

export type RuntimeCursorHandleKind =
  | 'move'
  | 'nw'
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w'
  | 'rotate'

// Runtime cursor intent reuses the primitive cursor-intent contract.
export type RuntimeCursorIntent = CursorIntent

/**
 * Defines vector-facing cursor state resolved from primitive runtime metadata.
 */
export interface RuntimeCursorState {
  /** Stores CSS cursor string consumed by viewport renderer bindings. */
  readonly cursor: string
  /** Stores normalized primitive cursor intent for diagnostics and future policy routing. */
  readonly intent: RuntimeCursorIntent
  /** Stores primitive source channel so debugging can explain cursor ownership. */
  readonly source: CursorRuntime['source']
}

/**
 * Defines vector cursor resolution inputs bridged into primitive cursor runtime.
 */
export interface ResolveRuntimeCursorOptions {
  /** Stores active tool-supplied cursor CSS token when tool wants explicit override. */
  toolCursor?: string
  /** Stores current high-level editing mode. */
  editingMode?: RuntimeEditingMode | null
  /** Stores active transform handle when transform interaction is hot. */
  activeHandle?: RuntimeCursorHandleKind | null
  /** Stores selected-node rotation for rotated resize cursor mapping. */
  rotationDegrees?: number
  /** Stores path-edit hit subtype so path affordance cursor can override tool cursor. */
  pathHitType?: 'anchorPoint' | 'segment' | 'inHandle' | 'outHandle' | null
  /** Stores cursor hint emitted by runtime overlay instruction contracts. */
  overlayCursorIntent?: CursorIntent | null
}

/**
 * Resolves the effective runtime cursor for vector editor pointer interactions.
 */
export function resolveRuntimeCursor(options: ResolveRuntimeCursorOptions): RuntimeCursorState {
  const overlaySceneCursor = options.overlayCursorIntent
  const pathSceneCursor = resolvePathHitCursorIntent(options.pathHitType)
  const resolved = resolveCursorRuntime({
    // Panning mode should dominate so drag affordance remains explicit.
    editingMode: options.editingMode === 'panning' ? {type: 'grabbing'} : undefined,
    // Overlay cursor hints are the highest-fidelity scene affordance channel.
    scene: overlaySceneCursor ?? pathSceneCursor,
    // Transform handles map to active-operation cursor hints.
    activeOperation: resolveActiveHandleCursorIntent(options.activeHandle, options.rotationDegrees ?? 0),
    // Tool-provided cursor tokens stay as low-priority custom fallback.
    tool: options.toolCursor ? {type: 'custom', css: options.toolCursor} : undefined,
    fallback: {type: 'default'},
  })

  return {
    cursor: resolved.css,
    intent: resolved.intent,
    source: resolved.source,
  }
}

/**
 * Resolves path-hit subtype into primitive cursor intent.
 */
function resolvePathHitCursorIntent(
  pathHitType: ResolveRuntimeCursorOptions['pathHitType'],
): CursorIntent | undefined {
  if (pathHitType === 'anchorPoint') {
    return {type: 'crosshair'}
  }
  if (pathHitType === 'segment') {
    // `copy` is not a canonical primitive intent, so emit one explicit custom CSS cursor.
    return {type: 'custom', css: 'copy'}
  }
  if (pathHitType === 'inHandle' || pathHitType === 'outHandle') {
    return {type: 'custom', css: 'alias'}
  }

  return undefined
}

/**
 * Resolves transform-handle subtype into primitive cursor intent.
 */
function resolveActiveHandleCursorIntent(
  activeHandle: RuntimeCursorHandleKind | null | undefined,
  rotationDegrees: number,
): CursorIntent | undefined {
  if (!activeHandle) {
    return undefined
  }
  if (activeHandle === 'move') {
    return {type: 'move'}
  }
  if (activeHandle === 'rotate') {
    // Emit custom rotate cursor so runtime can follow live transform angle.
    return {
      type: 'custom',
      css: resolveRotatingCursorCss(rotationDegrees),
    }
  }

  return {
    type: 'resize',
    direction: activeHandle,
    rotation: rotationDegrees,
  }
}

/**
 * Resolves a rotating cursor CSS value with inline SVG so angle can track
 * live rotation preview updates.
 */
function resolveRotatingCursorCss(rotationDegrees: number): string {
  const normalized = normalizeDegrees(rotationDegrees)
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <g transform="rotate(${normalized} 12 12)">
    <path d="M12 3a9 9 0 1 0 8.2 5.3" fill="none" stroke="#0f172a" stroke-width="2" stroke-linecap="round"/>
    <path d="M20.2 3.2L21 8.5L15.8 7.6" fill="none" stroke="#0f172a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>
  `.trim()
  const encoded = encodeURIComponent(svg)
  return `url("data:image/svg+xml,${encoded}") 12 12, url("/cursor/rotate-base.svg") 12 12, crosshair`
}

/**
 * Resolves degrees into [0, 360) for stable cursor rotation rendering.
 */
function normalizeDegrees(degrees: number): number {
  let normalized = degrees % 360
  if (normalized < 0) {
    normalized += 360
  }
  return normalized
}

