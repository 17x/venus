import type {MarqueeSelectionMode, MarqueeState} from './marqueeSelection.ts'

export interface MarqueeSelectionApplyController {
  applyWhileMoving: (input: {
    marquee: MarqueeState
    selectedIds: string[]
    dispatchSelection: (shapeIds: string[], mode: MarqueeSelectionMode) => void
  }) => void
  reset: () => void
}

/**
 * Deduplicates marquee move-time selection dispatches by tracking the last
 * emitted signature (mode + selected ids).
 */
export function createMarqueeSelectionApplyController(): MarqueeSelectionApplyController {
  let lastSignature = ''

  return {
    applyWhileMoving: ({marquee, selectedIds, dispatchSelection}) => {
      if (marquee.applyMode !== 'while-pointer-move') {
        return
      }

      const signature = `${marquee.mode}:${selectedIds.join(',')}`
      if (signature === lastSignature) {
        return
      }

      lastSignature = signature
      dispatchSelection(selectedIds, marquee.mode)
    },
    reset: () => {
      lastSignature = ''
    },
  }
}