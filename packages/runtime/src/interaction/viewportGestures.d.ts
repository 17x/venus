import { type EngineCanvasViewportState } from '@venus/engine';
import type { PointerState } from '@venus/shared-memory';
export interface ViewportGestureBindingOptions {
    element: HTMLElement;
    getViewportState: () => EngineCanvasViewportState;
    onPointerMove?: (pointer: PointerState) => void;
    onPointerDown?: (pointer: PointerState, modifiers?: {
        shiftKey: boolean;
        metaKey: boolean;
        ctrlKey: boolean;
        altKey: boolean;
    }) => void;
    onPointerUp?: VoidFunction;
    onPointerLeave?: VoidFunction;
    onZoomingChange?: (active: boolean) => void;
    onZoomCommitViewport?: (viewport: EngineCanvasViewportState) => void;
    onPanCommit?: (deltaX: number, deltaY: number) => void;
}
/**
 * Bind native browser gestures used by shared runtime adapters.
 *
 * Ownership:
 * - runtime-interaction owns gesture collection/dispatch policy
 * - runtime owns viewport state transitions
 * - engine owns matrix projection + wheel/pointer pan delta mechanics
 */
export declare function bindViewportGestures({ element, getViewportState, onPointerMove, onPointerDown, onPointerUp, onPointerLeave, onZoomingChange, onZoomCommitViewport, onPanCommit, }: ViewportGestureBindingOptions): () => void;
