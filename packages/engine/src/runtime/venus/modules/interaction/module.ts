/**
 * Interaction module implementation.
 *
 * Provides selection state management and selection change events.
 * Depends on the document service to resolve node ids for selectAll.
 * Future: snapping, drag, and transform will be added here.
 */
import type { VenusInteractionApi } from './api.ts'
import type { VenusModule, VenusModuleContext } from '../../Venus.ts'

/** Shape of the document service subset consumed by interaction. */
interface InteractionDocumentService {
  children(): readonly { id: string }[]
}

/**
 * Creates the interaction module definition.
 */
export function createVenusInteractionModule(): VenusModule {
  return {
    name: 'interaction' as const,

    install(context: VenusModuleContext): VenusInteractionApi {
      const selectedIds = new Set<string>()
      const listeners = new Set<(selection: ReadonlySet<string>) => void>()

      /** Notifies all registered listeners of the current selection. */
      const emitSelectionChange = () => {
        const snapshot = new Set(selectedIds)
        for (const handler of listeners) {
          handler(snapshot)
        }
      }

      const api: VenusInteractionApi = {
        get selection() {
          return new Set(selectedIds)
        },

        getSelection() {
          return new Set(selectedIds)
        },

        setSelection(ids: readonly string[]) {
          const nextIds = new Set(ids)
          if (nextIds.size === selectedIds.size && [...nextIds].every((id) => selectedIds.has(id))) {
            return
          }

          selectedIds.clear()
          for (const id of nextIds) {
            selectedIds.add(id)
          }
          emitSelectionChange()
        },

        select(ids: string | readonly string[]) {
          const idList = typeof ids === 'string' ? [ids] : ids
          let changed = false
          for (const id of idList) {
            if (!selectedIds.has(id)) {
              selectedIds.add(id)
              changed = true
            }
          }
          if (changed) {
            emitSelectionChange()
          }
        },

        deselect(ids: string | readonly string[]) {
          const idList = typeof ids === 'string' ? [ids] : ids
          let changed = false
          for (const id of idList) {
            if (selectedIds.has(id)) {
              selectedIds.delete(id)
              changed = true
            }
          }
          if (changed) {
            emitSelectionChange()
          }
        },

        selectAll() {
          selectedIds.clear()
          const docService = context.services.require<InteractionDocumentService>('document')
          const children = docService.children()
          for (const child of children) {
            if (child.id) {
              selectedIds.add(child.id)
            }
          }
          emitSelectionChange()
        },

        clearSelection() {
          if (selectedIds.size === 0) {
            return
          }
          selectedIds.clear()
          emitSelectionChange()
        },

        isSelected(id: string) {
          return selectedIds.has(id)
        },

        onSelectionChange(handler) {
          listeners.add(handler)
          return () => {
            listeners.delete(handler)
          }
        },
      }

      return api
    },
  }
}
