/**
 * History module definition.
 *
 * Wraps the existing VenusHistoryController in a defineVenusModule-compatible
 * shape so consumers can install it explicitly or rely on Venus auto-installing
 * it during construction.
 */
import type { VenusHistoryApi } from './api.ts'
import type { VenusModule, VenusModuleContext } from '../../Venus.ts'

/** Internal history bridge exposed by Venus to the history module. */
interface HistoryVenus {
  _historyUndo(): boolean
  _historyRedo(): boolean
  _historyCanUndo(): boolean
  _historyCanRedo(): boolean
  _historyClear(): void
}

/**
 * Creates the history module definition.
 */
export function createVenusHistoryModule(): VenusModule {
  return {
    name: 'history' as const,
    requires: ['document'],
    install(context: VenusModuleContext): VenusHistoryApi {
      const venus = context.venus as HistoryVenus
      return {
        undo(): boolean {
          return venus._historyUndo()
        },
        redo(): boolean {
          return venus._historyRedo()
        },
        canUndo(): boolean {
          return venus._historyCanUndo()
        },
        canRedo(): boolean {
          return venus._historyCanRedo()
        },
        clear(): void {
          venus._historyClear()
        },
      }
    },
  }
}
