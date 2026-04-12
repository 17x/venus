import { type EngineSelectionHandle, type EngineSelectionHandleBounds, type EngineSelectionHandleKind, type EngineSelectionHandlePoint } from '@venus/engine';
export type SelectionHandleKind = EngineSelectionHandleKind;
export type SelectionHandleBounds = EngineSelectionHandleBounds;
export type SelectionHandlePoint = EngineSelectionHandlePoint;
export type SelectionHandle = EngineSelectionHandle;
/**
 * Build resize + rotate handles around selection bounds and project them
 * through optional single-selection rotation.
 */
export declare function buildSelectionHandlesFromBounds(bounds: SelectionHandleBounds, options?: {
    rotateDegrees?: number;
    rotateOffset?: number;
}): SelectionHandle[];
/**
 * Pick the nearest selection handle by Euclidean distance threshold.
 */
export declare function pickSelectionHandleAtPoint<T extends SelectionHandlePoint>(point: SelectionHandlePoint, handles: T[], tolerance: number): T | null;
