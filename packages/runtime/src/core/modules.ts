import type {EditorRuntimeCommand} from '../worker/index.ts'
import type {PointerState} from '@venus/shared-memory'

export interface CanvasEditorModulePointerEvent {
  type: 'pointermove' | 'pointerdown'
  pointer: PointerState
  modifiers?: {
    shiftKey?: boolean
    metaKey?: boolean
    ctrlKey?: boolean
    altKey?: boolean
  }
}

export interface CanvasViewerModulePointerEvent {
  type: 'pointermove' | 'pointerdown'
  pointer: PointerState
}

export interface CanvasModuleContext<TSnapshot> {
  mode: 'editor' | 'viewer'
  getSnapshot: () => TSnapshot
}

export interface CanvasRuntimeModule<
  TSnapshot,
  TPointerEvent = CanvasEditorModulePointerEvent,
  TCommand = EditorRuntimeCommand,
> {
  id: string
  setup?: (context: CanvasModuleContext<TSnapshot>) => void | (() => void)
  onStart?: (context: CanvasModuleContext<TSnapshot>) => void
  onDestroy?: (context: CanvasModuleContext<TSnapshot>) => void
  beforePointer?: (event: TPointerEvent, context: CanvasModuleContext<TSnapshot>) => void
  afterPointer?: (event: TPointerEvent, context: CanvasModuleContext<TSnapshot>) => void
  beforeCommand?: (command: TCommand, context: CanvasModuleContext<TSnapshot>) => void
  afterCommand?: (command: TCommand, context: CanvasModuleContext<TSnapshot>) => void
}

export interface CanvasModuleRunner<TPointerEvent, TCommand> {
  onStart: () => void
  onDestroy: () => void
  beforePointer: (event: TPointerEvent) => void
  afterPointer: (event: TPointerEvent) => void
  beforeCommand: (command: TCommand) => void
  afterCommand: (command: TCommand) => void
}

export function createCanvasModuleRunner<TSnapshot, TPointerEvent, TCommand>(options: {
  mode: 'editor' | 'viewer'
  getSnapshot: () => TSnapshot
  modules?: Array<CanvasRuntimeModule<TSnapshot, TPointerEvent, TCommand>>
}): CanvasModuleRunner<TPointerEvent, TCommand> {
  const modules = options.modules ?? []
  const context: CanvasModuleContext<TSnapshot> = {
    mode: options.mode,
    getSnapshot: options.getSnapshot,
  }
  const teardowns = modules
    .map((module) => module.setup?.(context))
    .filter((teardown): teardown is () => void => typeof teardown === 'function')

  return {
    onStart: () => {
      modules.forEach((module) => {
        module.onStart?.(context)
      })
    },
    onDestroy: () => {
      modules.forEach((module) => {
        module.onDestroy?.(context)
      })
      teardowns.forEach((teardown) => {
        teardown()
      })
    },
    beforePointer: (event) => {
      modules.forEach((module) => {
        module.beforePointer?.(event, context)
      })
    },
    afterPointer: (event) => {
      modules.forEach((module) => {
        module.afterPointer?.(event, context)
      })
    },
    beforeCommand: (command) => {
      modules.forEach((module) => {
        module.beforeCommand?.(command, context)
      })
    },
    afterCommand: (command) => {
      modules.forEach((module) => {
        module.afterCommand?.(command, context)
      })
    },
  }
}
