import type {CursorIntent} from './CursorIntent.ts'
import {cursorIntentToCss} from './cursorCss.ts'

/**
 * Defines priority source names used by cursor runtime resolution.
 */
export type CursorSource =
  | 'app-mode'
  | 'active-operation'
  | 'temporary-tool'
  | 'overlay'
  | 'editing-mode'
  | 'tool'
  | 'scene'
  | 'default'

/**
 * Stores resolved cursor runtime state.
 */
export interface CursorRuntime<TCursorIntent = CursorIntent> {
  /** Stores resolved cursor intent payload. */
  intent: TCursorIntent
  /** Stores resolved CSS cursor token/string. */
  css: string
  /** Stores source channel that produced the resolved intent. */
  source: CursorSource
  /** Stores optional diagnostic reason for debug overlays. */
  reason?: string
  /** Stores previous CSS cursor for transition-aware callers. */
  lastCss?: string
}

/**
 * Defines candidate cursor intents from highest to lowest priority.
 */
export interface CursorResolveInput {
  /** Stores app-mode intent candidate. */
  appMode?: CursorIntent
  /** Stores active operation intent candidate. */
  activeOperation?: CursorIntent
  /** Stores temporary tool intent candidate. */
  temporaryTool?: CursorIntent
  /** Stores overlay hover intent candidate. */
  overlay?: CursorIntent
  /** Stores editing mode intent candidate. */
  editingMode?: CursorIntent
  /** Stores selected tool intent candidate. */
  tool?: CursorIntent
  /** Stores scene hit intent candidate. */
  scene?: CursorIntent
  /** Stores default fallback intent candidate. */
  fallback?: CursorIntent
}

/**
 * Resolves first available cursor intent using stable source priority.
 */
export function resolveCursorRuntime(
  input: CursorResolveInput,
  previous?: CursorRuntime,
): CursorRuntime {
  const candidates: Array<{source: CursorSource; intent: CursorIntent | undefined}> = [
    {source: 'app-mode', intent: input.appMode},
    {source: 'active-operation', intent: input.activeOperation},
    {source: 'temporary-tool', intent: input.temporaryTool},
    {source: 'overlay', intent: input.overlay},
    {source: 'editing-mode', intent: input.editingMode},
    {source: 'tool', intent: input.tool},
    {source: 'scene', intent: input.scene},
    {source: 'default', intent: input.fallback ?? {type: 'default'}},
  ]

  const resolvedCandidate = candidates.find((candidate) => !!candidate.intent)
  const intent = resolvedCandidate?.intent ?? {type: 'default'}

  return {
    intent,
    css: cursorIntentToCss(intent),
    source: resolvedCandidate?.source ?? 'default',
    lastCss: previous?.css,
  }
}

