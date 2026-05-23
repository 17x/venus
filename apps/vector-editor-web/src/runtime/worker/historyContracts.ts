/**
 * Patch vocabulary for local undo/redo.
 *
 * These patches describe concrete state differences, not user intent. That
 * makes them a better fit for reversible local history than command metadata
 * alone. We keep the set intentionally small for now and can extend it as the
 * worker starts mutating more scene fields.
 */
export type HistoryPatch =
  | {
      type: 'set-selected-index'
      prev: number
      next: number
    }
  | {
      type: 'rename-shape'
      shapeId: string
      prevName: string
      nextName: string
      prevText?: string
      nextText?: string
    }
  | {
      type: 'move-shape'
      shapeId: string
      prevX: number
      prevY: number
      nextX: number
      nextY: number
    }
  | {
      type: 'resize-shape'
      shapeId: string
      prevWidth: number
      prevHeight: number
      nextWidth: number
      nextHeight: number
    }
  | {
      type: 'rotate-shape'
      shapeId: string
      prevRotation: number
      nextRotation: number
    }
  | {
      type: 'patch-shape'
      shapeId: string
      prevFill?: {
        enabled?: boolean
        color?: string
      }
      nextFill?: {
        enabled?: boolean
        color?: string
      }
      prevStroke?: {
        enabled?: boolean
        color?: string
        weight?: number
      }
      nextStroke?: {
        enabled?: boolean
        color?: string
        weight?: number
      }
      prevShadow?: {
        enabled?: boolean
        color?: string
        offsetX?: number
        offsetY?: number
        blur?: number
      }
      nextShadow?: {
        enabled?: boolean
        color?: string
        offsetX?: number
        offsetY?: number
        blur?: number
      }
      prevTextRuns?: {
        start: number
        end: number
        style?: {
          color?: string
          fontFamily?: string
          fontSize?: number
          fontWeight?: number
          letterSpacing?: number
          lineHeight?: number
          textAlign?: 'left' | 'center' | 'right'
          verticalAlign?: 'top' | 'middle' | 'bottom'
          shadow?: {
            color?: string
            offsetX?: number
            offsetY?: number
            blur?: number
          }
          paragraphIndentLeft?: number
          paragraphIndentFirst?: number
          paragraphIndentRight?: number
          paragraphSpaceBeforeLine?: number
          paragraphSpaceAfterLine?: number
        }
      }[]
      nextTextRuns?: {
        start: number
        end: number
        style?: {
          color?: string
          fontFamily?: string
          fontSize?: number
          fontWeight?: number
          letterSpacing?: number
          lineHeight?: number
          textAlign?: 'left' | 'center' | 'right'
          verticalAlign?: 'top' | 'middle' | 'bottom'
          shadow?: {
            color?: string
            offsetX?: number
            offsetY?: number
            blur?: number
          }
          paragraphIndentLeft?: number
          paragraphIndentFirst?: number
          paragraphIndentRight?: number
          paragraphSpaceBeforeLine?: number
          paragraphSpaceAfterLine?: number
        }
      }[]
      prevCornerRadius?: number
      nextCornerRadius?: number
      prevCornerRadii?: {
        topLeft?: number
        topRight?: number
        bottomRight?: number
        bottomLeft?: number
      }
      nextCornerRadii?: {
        topLeft?: number
        topRight?: number
        bottomRight?: number
        bottomLeft?: number
      }
      prevEllipseStartAngle?: number
      nextEllipseStartAngle?: number
      prevEllipseEndAngle?: number
      nextEllipseEndAngle?: number
      prevFlipX?: boolean
      nextFlipX?: boolean
      prevFlipY?: boolean
      nextFlipY?: boolean
    }
  | {
      type: 'set-shape-clip'
      shapeId: string
      prevClipPathId?: string
      nextClipPathId?: string
      prevClipRule?: 'nonzero' | 'evenodd'
      nextClipRule?: 'nonzero' | 'evenodd'
    }
  | {
      type: 'set-shape-mask-schema'
      shapeId: string
      prevMaskGroupId?: string
      nextMaskGroupId?: string
      prevMaskRole?: 'host' | 'source'
      nextMaskRole?: 'host' | 'source'
    }
  | {
      type: 'set-shape-parent'
      shapeId: string
      prevParentId?: string | null
      nextParentId?: string | null
    }
  | {
      type: 'set-group-children'
      groupId: string
      prevChildIds?: string[]
      nextChildIds?: string[]
    }
  | {
      type: 'reorder-shape'
      shapeId: string
      fromIndex: number
      toIndex: number
    }
  | {
      type: 'insert-shape'
      index: number
      shape: {
        id: string
        type: string
        name: string
        parentId?: string | null
        childIds?: string[]
        text?: string
        assetId?: string
        assetUrl?: string
        clipPathId?: string
        clipRule?: 'nonzero' | 'evenodd'
        schema?: {
          sourceNodeType?: string
          sourceNodeKind?: string
          sourceFeatureKinds?: string[]
          maskGroupId?: string
          maskRole?: 'host' | 'source'
        }
        x: number
        y: number
        width: number
        height: number
        rotation?: number
        flipX?: boolean
        flipY?: boolean
        fill?: {
          enabled?: boolean
          color?: string
        }
        stroke?: {
          enabled?: boolean
          color?: string
          weight?: number
        }
        shadow?: {
          enabled?: boolean
          color?: string
          offsetX?: number
          offsetY?: number
          blur?: number
        }
        cornerRadius?: number
        cornerRadii?: {
          topLeft?: number
          topRight?: number
          bottomRight?: number
          bottomLeft?: number
        }
        ellipseStartAngle?: number
        ellipseEndAngle?: number
        points?: Array<{x: number; y: number}>
        bezierPoints?: Array<{
          anchor: {x: number; y: number}
          cp1?: {x: number; y: number} | null
          cp2?: {x: number; y: number} | null
        }>
      }
    }
  | {
      type: 'remove-shape'
      index: number
      shape: {
        id: string
        type: string
        name: string
        parentId?: string | null
        childIds?: string[]
        text?: string
        assetId?: string
        assetUrl?: string
        clipPathId?: string
        clipRule?: 'nonzero' | 'evenodd'
        schema?: {
          sourceNodeType?: string
          sourceNodeKind?: string
          sourceFeatureKinds?: string[]
          maskGroupId?: string
          maskRole?: 'host' | 'source'
        }
        x: number
        y: number
        width: number
        height: number
        rotation?: number
        flipX?: boolean
        flipY?: boolean
        fill?: {
          enabled?: boolean
          color?: string
        }
        stroke?: {
          enabled?: boolean
          color?: string
          weight?: number
        }
        shadow?: {
          enabled?: boolean
          color?: string
          offsetX?: number
          offsetY?: number
          blur?: number
        }
        cornerRadius?: number
        cornerRadii?: {
          topLeft?: number
          topRight?: number
          bottomRight?: number
          bottomLeft?: number
        }
        ellipseStartAngle?: number
        ellipseEndAngle?: number
        points?: Array<{x: number; y: number}>
        bezierPoints?: Array<{
          anchor: {x: number; y: number}
          cp1?: {x: number; y: number} | null
          cp2?: {x: number; y: number} | null
        }>
      }
    }

export type HistoryEntrySource = 'local' | 'remote'

export interface HistoryEntry {
  id: string
  label: string
  source: HistoryEntrySource
  forward: HistoryPatch[]
  backward: HistoryPatch[]
}

/**
 * Declares local-command metadata used by history merge policy.
 */
export interface HistoryLocalCommandMeta {
  /** Stores command id emitted by runtime command envelope. */
  commandId: string
  /** Stores transaction id shared by one logical command chain. */
  transactionId: string
  /** Stores command source category used by merge policy gating. */
  commandSource: 'user' | 'derived' | 'system'
  /** Stores command issue timestamp in milliseconds. */
  issuedAt: number
  /** Stores command type for diagnostics and optional merge policies. */
  commandType: string
}

/**
 * Declares optional local-history merge settings for one push operation.
 */
export interface HistoryLocalMergeOptions {
  /** Enables transaction-aware merge for current local entry push. */
  enabled?: boolean
  /** Stores optional max issued-at gap for merge eligibility (milliseconds). */
  maxIssuedAtGapMs?: number
  /** Stores optional allow-list of command types eligible for merge. */
  allowedCommandTypes?: string[]
}

/**
 * Declares optional local push options for command metadata and merge policy.
 */
export interface HistoryPushLocalEntryOptions {
  /** Stores optional command metadata used by transaction-aware merge policy. */
  commandMeta?: HistoryLocalCommandMeta
  /** Stores optional merge policy controls for this local push. */
  merge?: HistoryLocalMergeOptions
}

export interface HistorySummaryEntry {
  /** Stores history entry id. */
  id: string
  /** Stores history entry label. */
  label: string
  /** Stores entry source category. */
  source: HistoryEntrySource
}

/**
 * Declares one transaction-level summary group derived from history entries.
 */
export interface HistorySummaryTransactionGroup {
  /** Stores stable transaction identifier used by this group. */
  transactionId: string
  /** Stores source category for grouped entries. */
  source: HistoryEntrySource
  /** Stores grouped entry ids in timeline order. */
  entryIds: string[]
  /** Stores display label used by grouped transaction views. */
  label: string
  /** Stores number of entries in this transaction group. */
  entryCount: number
  /** Stores first command issued timestamp in milliseconds. */
  startIssuedAt: number
  /** Stores last command issued timestamp in milliseconds. */
  endIssuedAt: number
}

/**
 * Declares one replayable history entry used by crash-recovery recent-N snapshots.
 */
export interface HistoryRecoveryReplayEntry {
  /** Stores history entry id. */
  id: string
  /** Stores history entry label. */
  label: string
  /** Stores history entry source category. */
  source: HistoryEntrySource
  /** Stores forward patch list replayed during recovery apply. */
  forward: HistoryPatch[]
  /** Stores backward patch list replayed during recovery rollback. */
  backward: HistoryPatch[]
  /** Stores optional transaction id for command-chain replay grouping. */
  transactionId?: string
  /** Stores optional issued-at timestamp for deterministic ordering diagnostics. */
  issuedAt?: number
}

/**
 * Declares one replay mode snapshot for crash-recovery reconstruction.
 */
export interface HistoryRecoveryReplayModeSnapshot {
  /** Stores replay mode label. */
  mode: 'local-only' | 'merged'
  /** Stores replay entries in deterministic replay order. */
  entries: HistoryRecoveryReplayEntry[]
}

/**
 * Declares crash-recovery replay payload that keeps both local-only and merged views.
 */
export interface HistoryRecoveryReplaySnapshot {
  /** Stores max replay length used while building this snapshot. */
  maxEntries: number
  /** Stores local-only replay snapshot used by local undo/redo recovery. */
  localOnly: HistoryRecoveryReplayModeSnapshot
  /** Stores merged replay snapshot that includes remote-log visibility. */
  merged: HistoryRecoveryReplayModeSnapshot
}

/**
 * Declares immutable history summary snapshot consumed by runtime and UI layers.
 */
export interface HistorySummary {
  /** Stores flattened history entries in timeline order. */
  entries: HistorySummaryEntry[]
  /** Stores transaction-level grouped view for timeline consumers. */
  transactionGroups: HistorySummaryTransactionGroup[]
  /** Stores current local cursor position. */
  cursor: number
  /** Indicates whether local undo is currently possible. */
  canUndo: boolean
  /** Indicates whether local redo is currently possible. */
  canRedo: boolean
  /** Stores crash-recovery recent-N replay snapshots for local-only and merged modes. */
  recoveryReplay: HistoryRecoveryReplaySnapshot
}

export interface HistoryTransition {
  appliedEntry: HistoryEntry | null
  summary: HistorySummary
}

export interface HistoryManager {
  /** Returns immutable summary snapshot for UI and diagnostics. */
  getSummary: () => HistorySummary
  /** Pushes one local history entry with optional merge metadata. */
  pushLocalEntry: (entry: Omit<HistoryEntry, 'source'>, options?: HistoryPushLocalEntryOptions) => HistorySummary
  /** Pushes one remote history entry (non-undoable locally). */
  pushRemoteEntry: (entry: Omit<HistoryEntry, 'source'>) => HistorySummary
  /** Applies local undo transition. */
  undo: () => HistoryTransition
  /** Applies local redo transition. */
  redo: () => HistoryTransition
  /** Returns crash-recovery replay snapshot for local-only and merged modes. */
  getRecoveryReplay: (maxEntries?: number) => HistoryRecoveryReplaySnapshot
}
