export type EngineSelectionHandleKind = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rotate';
export interface EngineSelectionHandleBounds {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}
export interface EngineSelectionHandlePoint {
    x: number;
    y: number;
}
export interface EngineSelectionHandle extends EngineSelectionHandlePoint {
    id: string;
    kind: EngineSelectionHandleKind;
}
export declare function buildEngineSelectionHandlesFromBounds(bounds: EngineSelectionHandleBounds, options?: {
    rotateDegrees?: number;
    rotateOffset?: number;
}): EngineSelectionHandle[];
export declare function pickEngineSelectionHandleAtPoint<T extends EngineSelectionHandlePoint>(point: EngineSelectionHandlePoint, handles: T[], tolerance: number): T | null;
