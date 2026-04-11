import { type ResolvedShapeTransformRecord, type ShapeTransformBatchCommand, type ShapeTransformBatchItem, type ShapeTransformRecord } from '@venus/document-core';
export type TransformHandleKind = 'move' | 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rotate';
export interface TransformBounds {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}
export interface TransformPoint {
    x: number;
    y: number;
}
export interface TransformSessionShape extends ResolvedShapeTransformRecord {
    shapeId: string;
}
export interface TransformPreviewShape extends ShapeTransformRecord {
    shapeId: string;
}
export interface TransformPreview {
    shapes: TransformPreviewShape[];
}
export type TransformBatchItem = ShapeTransformBatchItem;
interface TransformShapeSource {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
    flipX?: boolean;
    flipY?: boolean;
}
export interface TransformSession {
    shapeIds: string[];
    shapes: TransformSessionShape[];
    handle: TransformHandleKind;
    start: TransformPoint;
    current: TransformPoint;
    startBounds: TransformBounds;
}
/**
 * Normalizes a document/runtime shape into the transform-session contract used
 * by shared resize/rotate/move interactions.
 */
export declare function createTransformSessionShape(shape: TransformShapeSource): TransformSessionShape;
/**
 * Normalizes a document/runtime shape into the preview payload used by shared
 * transform preview state and commit synchronization.
 */
export declare function createTransformPreviewShape(shape: TransformShapeSource): TransformPreviewShape;
/**
 * Resolves preview payloads back into batch command patches so app shells can
 * dispatch one shared transform commit contract to worker/runtime layers.
 */
export declare function buildTransformBatch(documentShapes: TransformShapeSource[], preview: TransformPreview | null | undefined): TransformBatchItem[];
export declare function createTransformBatchCommand(documentShapes: TransformShapeSource[], preview: TransformPreview | null | undefined): ShapeTransformBatchCommand | null;
export declare function createTransformSessionManager(): {
    start: (params: {
        shapeIds: string[];
        shapes: TransformSessionShape[];
        handle: TransformHandleKind;
        pointer: TransformPoint;
        startBounds: TransformBounds;
    }) => void;
    update: (pointer: TransformPoint) => TransformPreview | null;
    commit: () => TransformSession | null;
    cancel: () => void;
    getSession: () => TransformSession | null;
};
export {};
