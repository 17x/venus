import type {CanvasRuntimeModule} from '@venus/runtime'

export interface CanvasHistoryConfig {
  enabled: boolean
}

export interface CanvasHistoryModule<TSnapshot> extends CanvasRuntimeModule<TSnapshot> {
  kind: 'history'
  config: CanvasHistoryConfig
}

export const DEFAULT_HISTORY_CONFIG: CanvasHistoryConfig = {
  enabled: true,
}

export function isHistoryCommand(command: {type: string}) {
  return command.type.startsWith('history.')
}

export function createHistoryModule<TSnapshot>(options?: {
  id?: string
  config?: Partial<CanvasHistoryConfig>
  onHistoryCommand?: (command: {type: string}) => void
}): CanvasHistoryModule<TSnapshot> {
  const config: CanvasHistoryConfig = {
    ...DEFAULT_HISTORY_CONFIG,
    ...options?.config,
  }

  return {
    id: options?.id ?? 'builtin.history',
    kind: 'history',
    config,
    beforeCommand: (command) => {
      if (!config.enabled || !isHistoryCommand(command)) {
        return
      }
      options?.onHistoryCommand?.(command)
    },
  }
}
