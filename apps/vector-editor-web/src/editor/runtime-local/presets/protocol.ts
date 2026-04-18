import type {CanvasRuntimeModule} from '@vector/runtime'

export interface CanvasProtocolConfig {
  enabled: boolean
  blocklist: string[]
}

export interface CanvasProtocolModule<TSnapshot> extends CanvasRuntimeModule<TSnapshot> {
  kind: 'protocol'
  config: CanvasProtocolConfig
}

export const DEFAULT_PROTOCOL_CONFIG: CanvasProtocolConfig = {
  enabled: true,
  blocklist: [],
}

export function createProtocolModule<TSnapshot>(options?: {
  id?: string
  config?: Partial<CanvasProtocolConfig>
  onCommand?: (command: {type: string}) => void
}): CanvasProtocolModule<TSnapshot> {
  const config: CanvasProtocolConfig = {
    ...DEFAULT_PROTOCOL_CONFIG,
    ...options?.config,
    blocklist: options?.config?.blocklist ?? DEFAULT_PROTOCOL_CONFIG.blocklist,
  }

  return {
    id: options?.id ?? 'builtin.protocol',
    kind: 'protocol',
    config,
    // Keep protocol policy centralized in one module hook so apps can audit
    // or block command categories without touching runtime internals.
    beforeCommand: (command) => {
      if (!config.enabled) {
        return
      }
      if (config.blocklist.includes(command.type)) {
        throw new Error(`[runtime-presets] blocked command type: ${command.type}`)
      }
      options?.onCommand?.(command)
    },
  }
}
