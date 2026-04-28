/**
 * Defines reusable tool event handler contract for editor interaction routing.
 */
export interface ToolHandler<TContext, TEvent, TResult> {
  /** Runs when tool is activated as current effective tool. */
  onActivate?: (ctx: TContext) => TResult
  /** Runs when tool is deactivated because effective tool changed. */
  onDeactivate?: (ctx: TContext) => TResult
  /** Runs on pointer down routed to this tool. */
  onPointerDown?: (ctx: TContext, event: TEvent) => TResult
  /** Runs on pointer move routed to this tool. */
  onPointerMove?: (ctx: TContext, event: TEvent) => TResult
  /** Runs on pointer up routed to this tool. */
  onPointerUp?: (ctx: TContext, event: TEvent) => TResult
  /** Runs on key down routed to this tool. */
  onKeyDown?: (ctx: TContext, event: TEvent) => TResult
  /** Runs on key up routed to this tool. */
  onKeyUp?: (ctx: TContext, event: TEvent) => TResult
  /** Runs when active operation/tool route is cancelled. */
  onCancel?: (ctx: TContext) => TResult
}

/**
 * Defines dispatchable lifecycle event names supported by tool handlers.
 */
export type ToolHandlerEventType =
  | 'activate'
  | 'deactivate'
  | 'pointerdown'
  | 'pointermove'
  | 'pointerup'
  | 'keydown'
  | 'keyup'
  | 'cancel'

/**
 * Dispatches one tool event to matching handler callback when it exists.
 */
export function dispatchToolHandlerEvent<TContext, TEvent, TResult>(
  handler: ToolHandler<TContext, TEvent, TResult>,
  eventType: ToolHandlerEventType,
  ctx: TContext,
  event?: TEvent,
): TResult | undefined {
  if (eventType === 'activate') {
    return handler.onActivate?.(ctx)
  }

  if (eventType === 'deactivate') {
    return handler.onDeactivate?.(ctx)
  }

  if (eventType === 'pointerdown') {
    return event !== undefined ? handler.onPointerDown?.(ctx, event) : undefined
  }

  if (eventType === 'pointermove') {
    return event !== undefined ? handler.onPointerMove?.(ctx, event) : undefined
  }

  if (eventType === 'pointerup') {
    return event !== undefined ? handler.onPointerUp?.(ctx, event) : undefined
  }

  if (eventType === 'keydown') {
    return event !== undefined ? handler.onKeyDown?.(ctx, event) : undefined
  }

  if (eventType === 'keyup') {
    return event !== undefined ? handler.onKeyUp?.(ctx, event) : undefined
  }

  // Route explicit cancel to allow operation lifecycle interruption handling.
  return handler.onCancel?.(ctx)
}

