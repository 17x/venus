import { type Mat3, type Point2D } from '../math/matrix.ts';
/**
 * Fully resolved viewport state used by runtime, interaction, and renderer.
 *
 * `matrix` maps world -> screen, while `inverseMatrix` maps screen -> world.
 */
export interface EngineCanvasViewportState {
    inverseMatrix: Mat3;
    matrix: Mat3;
    offsetX: number;
    offsetY: number;
    scale: number;
    viewportWidth: number;
    viewportHeight: number;
}
export interface EngineViewportFitDocumentLike {
    width: number;
    height: number;
}
/**
 * Initial viewport before the canvas element reports measured size.
 */
export declare const DEFAULT_ENGINE_VIEWPORT: EngineCanvasViewportState;
/**
 * Clamp viewport zoom to a shared safe interaction envelope.
 */
export declare function clampEngineViewportScale(scale: number): number;
/**
 * Rebuild derived matrices after any viewport scalar/offset change.
 */
export declare function resolveEngineViewportState(viewport: Pick<EngineCanvasViewportState, 'offsetX' | 'offsetY' | 'scale' | 'viewportWidth' | 'viewportHeight'>): EngineCanvasViewportState;
/**
 * Fit a document-like rect into the available viewport area with shared
 * padding rules.
 */
export declare function fitEngineViewportToDocument(document: EngineViewportFitDocumentLike, viewport: EngineCanvasViewportState): EngineCanvasViewportState;
/**
 * Translate viewport by a screen-space delta.
 */
export declare function panEngineViewportState(viewport: EngineCanvasViewportState, deltaX: number, deltaY: number): EngineCanvasViewportState;
/**
 * Update viewport dimensions while preserving current zoom and offsets.
 */
export declare function resizeEngineViewportState(viewport: EngineCanvasViewportState, width: number, height: number): EngineCanvasViewportState;
/**
 * Zoom around an optional screen-space anchor.
 *
 * Keeping the anchor's world point visually stable avoids zoom drift.
 */
export declare function zoomEngineViewportState(viewport: EngineCanvasViewportState, nextScale: number, anchor?: Point2D): EngineCanvasViewportState;
