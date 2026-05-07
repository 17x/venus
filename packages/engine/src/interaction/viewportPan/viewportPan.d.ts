export interface EngineViewportPanOffset {
    x: number;
    y: number;
}
export interface EngineViewportPanOrigin {
    x: number;
    y: number;
    pointerId: number;
}
/**
 * Seed a pointer-pan session from the pointerdown location.
 */
export declare function createEngineViewportPanOrigin(input: {
    x: number;
    y: number;
    pointerId: number;
}): EngineViewportPanOrigin;
/**
 * Convert wheel deltas into viewport pan offsets.
 *
 * Browser wheel deltas are scroll intent, while viewport offset is translation,
 * so we invert signs here to keep one shared interpretation.
 */
export declare function accumulateEngineWheelPanOffset(offset: EngineViewportPanOffset, input: {
    deltaX: number;
    deltaY: number;
}): EngineViewportPanOffset;
/**
 * Update pointer-pan session and return the viewport delta to commit.
 */
export declare function accumulateEnginePointerPanOffset(offset: EngineViewportPanOffset, origin: EngineViewportPanOrigin, pointer: {
    x: number;
    y: number;
    pointerId: number;
}): {
    offset: EngineViewportPanOffset;
    origin: EngineViewportPanOrigin;
};
