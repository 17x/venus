/**
 * Runtime-side tool lifecycle contract. Product layers map UI tools to these
 * handlers, but the lifecycle semantics remain framework-agnostic.
 */
export interface RuntimeToolHandlerContext {
  readonly activeTool: string
  readonly previousTool?: string
  readonly editingMode?: string
}

export interface RuntimeToolPointerEvent {
  readonly worldX: number
  readonly worldY: number
  readonly viewportX: number
  readonly viewportY: number
  readonly shiftKey: boolean
  readonly metaKey: boolean
  readonly ctrlKey: boolean
  readonly altKey: boolean
  readonly button: number
}

export interface RuntimeToolKeyboardEvent {
  readonly key: string
  readonly shiftKey: boolean
  readonly metaKey: boolean
  readonly ctrlKey: boolean
  readonly altKey: boolean
}

export interface RuntimeToolOverlayData {
  readonly kind: string
  readonly payload?: Record<string, unknown>
}

export interface RuntimeToolStatusHint {
  readonly id: string
  readonly message: string
}

export interface RuntimeToolHandler {
  readonly id: string
  readonly label?: string

  onEnter?(ctx: RuntimeToolHandlerContext): void
  onExit?(ctx: RuntimeToolHandlerContext): void

  onPointerDown?(event: RuntimeToolPointerEvent): boolean | void
  onPointerMove?(event: RuntimeToolPointerEvent): boolean | void
  onPointerUp?(event: RuntimeToolPointerEvent): boolean | void
  onDoubleClick?(event: RuntimeToolPointerEvent): boolean | void

  onKeyDown?(event: RuntimeToolKeyboardEvent): boolean | void
  onKeyUp?(event: RuntimeToolKeyboardEvent): boolean | void
  onCancel?(): void

  getCursor?(): string | undefined
  getOverlayData?(): RuntimeToolOverlayData[]
  getStatusHints?(): RuntimeToolStatusHint[]
}

export interface RuntimeToolRegistry {
  register(handler: RuntimeToolHandler): void
  unregister(id: string): void
  get(id: string): RuntimeToolHandler | undefined
  list(): RuntimeToolHandler[]
  activate(nextToolId: string, context?: Omit<RuntimeToolHandlerContext, 'activeTool' | 'previousTool'>): void
  getActiveToolId(): string | null
}

export function createRuntimeToolRegistry(): RuntimeToolRegistry {
  const handlers = new Map<string, RuntimeToolHandler>()
  let activeToolId: string | null = null

  const buildContext = (
    nextToolId: string,
    prevToolId?: string,
    context?: Omit<RuntimeToolHandlerContext, 'activeTool' | 'previousTool'>,
  ): RuntimeToolHandlerContext => ({
    activeTool: nextToolId,
    previousTool: prevToolId,
    editingMode: context?.editingMode,
  })

  return {
    register(handler) {
      handlers.set(handler.id, handler)
    },
    unregister(id) {
      handlers.delete(id)
      if (activeToolId === id) {
        activeToolId = null
      }
    },
    get(id) {
      return handlers.get(id)
    },
    list() {
      return Array.from(handlers.values())
    },
    activate(nextToolId, context) {
      const next = handlers.get(nextToolId)
      if (!next) {
        activeToolId = nextToolId
        return
      }

      const prevToolId = activeToolId ?? undefined
      if (prevToolId && prevToolId !== nextToolId) {
        const prev = handlers.get(prevToolId)
        prev?.onExit?.(buildContext(prevToolId, prevToolId, context))
      }

      activeToolId = nextToolId
      next.onEnter?.(buildContext(nextToolId, prevToolId, context))
    },
    getActiveToolId() {
      return activeToolId
    },
  }
}
