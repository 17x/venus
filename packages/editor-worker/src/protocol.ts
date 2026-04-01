import type { EditorDocument, ShapeRecord, ToolId } from '@venus/editor-core'
import type { CollaborationOperation, CollaborationState } from './collaboration.ts'
import type { HistorySummary } from './history.ts'
import type { PointerState } from '@venus/shared-memory'

/**
 * Shared worker protocol for the current vector editor runtime.
 *
 * Why:
 * - These types are consumed by the worker implementation, the app shell, and
 *   `canvas-base`.
 * - Keeping them separate from the runtime implementation makes the protocol
 *   easier to evolve and reuse.
 */

export interface WorkerInitMessage {
  type: 'init'
  buffer: SharedArrayBuffer
  capacity: number
  document: EditorDocument
}

export interface WorkerPointerMessage {
  type: 'pointermove' | 'pointerdown'
  pointer: PointerState
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
  | { type: 'viewport.fit' }
  | { type: 'viewport.zoomIn' }
  | { type: 'viewport.zoomOut' }
  | { type: 'selection.delete' }
  | { type: 'selection.set'; shapeId: string | null }
  | { type: 'tool.select'; tool: ToolId }
  | { type: 'shape.move'; shapeId: string; x: number; y: number }
  | { type: 'shape.resize'; shapeId: string; width: number; height: number }
  | { type: 'shape.insert'; shape: ShapeRecord; index?: number }
  | { type: 'shape.remove'; shapeId: string }

export interface SceneUpdateMessage {
  type: 'scene-ready' | 'scene-update'
  document: EditorDocument
  stats: {
    version: number
    shapeCount: number
    hoveredIndex: number
    selectedIndex: number
  }
  history: HistorySummary
  collaboration: CollaborationState
}
