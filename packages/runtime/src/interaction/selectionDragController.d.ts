import { type EditorDocument } from '@venus/document-core';
import type { SceneShapeSnapshot } from '@venus/shared-memory';
export interface SelectionDragModifiers {
    shiftKey?: boolean;
    metaKey?: boolean;
    ctrlKey?: boolean;
    altKey?: boolean;
}
export interface SelectionDragSnapshot {
    document: EditorDocument;
    shapes: SceneShapeSnapshot[];
}
export interface SelectionDragShapeState {
    shapeId: string;
    x: number;
    y: number;
}
export interface SelectionDragSession {
    start: {
        x: number;
        y: number;
    };
    current: {
        x: number;
        y: number;
    };
    bounds: {
        minX: number;
        minY: number;
        maxX: number;
        maxY: number;
    };
    shapes: SelectionDragShapeState[];
}
export interface SelectionDragMoveResult {
    phase: 'none' | 'pending' | 'started' | 'dragging';
    session: SelectionDragSession | null;
}
export interface SelectionDragController {
    pointerDown: (pointer: {
        x: number;
        y: number;
    }, snapshot: SelectionDragSnapshot, modifiers?: SelectionDragModifiers, options?: {
        hitShapeId?: string | null;
    }) => boolean;
    pointerMove: (pointer: {
        x: number;
        y: number;
    }, snapshot: SelectionDragSnapshot) => SelectionDragMoveResult;
    pointerUp: () => SelectionDragSession | null;
    clear: () => void;
    getSession: () => SelectionDragSession | null;
}
export declare function createSelectionDragController(options?: {
    dragThresholdPx?: number;
    lineHitTolerance?: number;
    allowFrameSelection?: boolean;
}): SelectionDragController;
