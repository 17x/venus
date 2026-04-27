import type { DocumentNode, EditorDocument, ToolId, ToolName } from '@vector/model'
import type { ShapeTransformBatchCommand } from '@venus/engine'
import type { CollaborationOperation, CollaborationState } from './collaboration.ts'
import type { HistorySummary } from './history.ts'
import type { PointerState } from '@vector/runtime/shared-memory'

/**
 * Shared worker protocol for the current vector editor runtime.
 *
 * Why:
 * - These types are consumed by the worker implementation, the app shell, and
 *   the shared runtime stack.
 * - Keeping them separate from the runtime implementation makes the protocol
 *   easier to evolve and reuse.
 */

export interface WorkerInitMessage {
  type: 'init'
  buffer: SharedArrayBuffer
  capacity: number
  document: EditorDocument
  interaction?: {
    allowFrameSelection?: boolean
    strictStrokeHitTest?: boolean
  }
}

export interface WorkerPointerMessage {
  type: 'pointermove' | 'pointerdown'
  pointer: PointerState
  modifiers?: {
    shiftKey?: boolean
    metaKey?: boolean
    ctrlKey?: boolean
    altKey?: boolean
  }
}

export interface WorkerPointerLeaveMessage {
  type: 'pointerleave'
}

export interface WorkerCommandMessage {
  type: 'command'
  command: EditorRuntimeCommand
}

export interface WorkerRemoteOperationMessage {
  type: 'collaboration.receive'
  operation: CollaborationOperation
}

export type EditorWorkerMessage =
  | WorkerInitMessage
  | WorkerPointerMessage
  | WorkerPointerLeaveMessage
  | WorkerCommandMessage
  | WorkerRemoteOperationMessage

export type EditorRuntimeCommand =
  | { type: 'history.undo' }
  | { type: 'history.redo' }
  | { type: 'snapping.pause' }
  | { type: 'snapping.resume' }
  | { type: 'group.enter-isolation'; groupId?: string }
  | { type: 'group.exit-isolation' }
  | { type: 'mask.create' }
  | { type: 'mask.release' }
  | { type: 'mask.select-host' }
  | { type: 'mask.select-source' }
  | { type: 'selection.cycle-hit-target'; direction?: 'forward' | 'backward' }
  | { type: 'viewport.fit' }
  | { type: 'viewport.zoomIn' }
  | { type: 'viewport.zoomOut' }
  | { type: 'selection.delete' }
  | {
      type: 'selection.set'
      shapeId?: string | null
      shapeIds?: string[]
      mode?: 'replace' | 'add' | 'remove' | 'toggle' | 'clear'
      preserveExactShapeIds?: boolean
    }
  | { type: 'tool.select'; tool: ToolId; toolName?: ToolName }
  | { type: 'shape.rename'; shapeId: string; name: string; text?: string }
  | { type: 'shape.move'; shapeId: string; x: number; y: number }
  | { type: 'shape.resize'; shapeId: string; width: number; height: number }
  | { type: 'shape.rotate'; shapeId: string; rotation: number }
  | {
      type: 'shape.rotate.batch'
      rotations: Array<{
        shapeId: string
        rotation: number
      }>
    }
  | ShapeTransformBatchCommand
  | {
      type: 'shape.patch'
      shapeId: string
      patch: {
        fill?: DocumentNode['fill']
        stroke?: DocumentNode['stroke']
        shadow?: DocumentNode['shadow']
        cornerRadius?: number
        cornerRadii?: DocumentNode['cornerRadii']
        ellipseStartAngle?: number
        ellipseEndAngle?: number
        flipX?: boolean
        flipY?: boolean
      }
    }
  | { type: 'shape.set-clip'; shapeId: string; clipPathId?: string; clipRule?: 'nonzero' | 'evenodd' }
  | { type: 'shape.reorder'; shapeId: string; toIndex: number }
  | { type: 'shape.insert'; shape: DocumentNode; index?: number }
  | { type: 'shape.insert.batch'; shapes: DocumentNode[]; index?: number }
  | { type: 'shape.remove'; shapeId: string }
  | { type: 'shape.group'; shapeIds?: string[]; groupId?: string; name?: string }
  | { type: 'shape.ungroup'; groupId?: string }
  | { type: 'shape.convert-to-path'; shapeIds?: string[] }
  | {
      type: 'shape.boolean'
      shapeIds?: string[]
      mode: 'union' | 'subtract' | 'intersect'
    }
  | {
      type: 'shape.align'
      shapeIds?: string[]
      mode: 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom'
      reference?: 'selection' | 'first'
    }
  | {
      type: 'shape.distribute'
      shapeIds?: string[]
      mode: 'hspace' | 'vspace'
    }

export interface SceneUpdateMessage {
  type: 'scene-ready' | 'scene-update'
  updateKind: 'full' | 'flags'
  document?: EditorDocument
  stats: {
    version: number
    shapeCount: number
    hoveredIndex: number
    selectedIndex: number
  }
  history: HistorySummary
  collaboration: CollaborationState
}
