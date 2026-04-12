import type { Point2D } from '../math/matrix.ts';
export interface EngineZoomWheelInput {
    clientX: number;
    clientY: number;
    ctrlKey: boolean;
    metaKey: boolean;
    deltaMode: number;
    deltaX: number;
    deltaY: number;
    timeStamp?: number;
}
export type EngineZoomInputSource = 'mouse' | 'trackpad';
export interface EngineNormalizedZoomDelta {
    anchor: Point2D;
    delta: number;
    source: EngineZoomInputSource;
    timeStamp?: number;
}
export interface EngineZoomSessionState {
    active: boolean;
    factor: number;
    anchor: Point2D | null;
    lastEventAt: number;
    source: EngineZoomInputSource | null;
}
export interface EngineZoomWheelResult {
    session: EngineZoomSessionState;
    factor: number;
    anchor: Point2D;
    settleDelay: number;
    source: EngineZoomInputSource;
}
export declare const DEFAULT_ENGINE_ZOOM_SESSION: EngineZoomSessionState;
/**
 * Heuristic-only source detector used by higher-level adapters.
 * This intentionally avoids DOM globals so engine stays platform-agnostic.
 */
export declare function detectEngineZoomInputSource(input: Pick<EngineZoomWheelInput, 'deltaMode' | 'deltaX' | 'deltaY'>): EngineZoomInputSource;
export declare function normalizeEngineZoomDelta(input: EngineZoomWheelInput): EngineNormalizedZoomDelta;
export declare function accumulateEngineZoomSession(session: EngineZoomSessionState, update: {
    anchor: {
        x: number;
        y: number;
    };
    factor: number;
    source: EngineZoomInputSource;
    timeStamp?: number;
}): EngineZoomSessionState;
export declare function getEngineZoomSettleDelay(source: EngineZoomInputSource | null): 120 | 72;
export declare function resetEngineZoomSession(): EngineZoomSessionState;
/**
 * Single-call zoom entry for adapters: resolves source, normalizes delta,
 * updates session state, and returns per-event zoom factor.
 */
export declare function handleEngineZoomWheel(session: EngineZoomSessionState, input: EngineZoomWheelInput): EngineZoomWheelResult;
