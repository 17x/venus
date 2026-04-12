import type { EditorDocument } from '@venus/document-core';
import { type CanvasEditorInstance, type CanvasEditorInstanceOptions, type CanvasRuntimeSnapshot } from '@venus/runtime';
import { type CanvasSnapshotStore } from './store.ts';
/**
 * React adapter for the imperative runtime controller.
 *
 * Apps use this hook instead of talking to the controller directly so the
 * editor runtime fits naturally into React render/update flow.
 */
export declare function useCanvasRuntime<TDocument extends EditorDocument>(options: CanvasEditorInstanceOptions<TDocument>): {
    clearHover: () => void;
    dispatchCommand: (command: import("@venus/runtime/worker").EditorRuntimeCommand) => void;
    fitViewport: () => void;
    panViewport: (deltaX: number, deltaY: number) => void;
    postPointer: (type: "pointermove" | "pointerdown", pointer: import("@venus/shared-memory").PointerState, modifiers?: {
        shiftKey?: boolean;
        metaKey?: boolean;
        ctrlKey?: boolean;
        altKey?: boolean;
    }) => void;
    receiveRemoteOperation: (operation: import("@venus/runtime/worker").CollaborationOperation) => void;
    resizeViewport: (width: number, height: number) => void;
    setViewport: (viewport: import("@venus/engine").EngineCanvasViewportState) => void;
    zoomViewport: (nextScale: number, anchor?: {
        x: number;
        y: number;
    }) => void;
    collaboration: import("@venus/runtime/worker").CollaborationState;
    document: TDocument;
    history: import("@venus/runtime/worker").HistorySummary;
    ready: boolean;
    sabSupported: boolean;
    shapes: import("@venus/shared-memory").SceneShapeSnapshot[];
    stats: import("@venus/shared-memory").SceneStats;
    viewport: import("@venus/engine").EngineCanvasViewportState;
};
export type CanvasRuntimeStore<TDocument extends EditorDocument> = CanvasSnapshotStore<CanvasRuntimeSnapshot<TDocument>, CanvasEditorInstance<TDocument>>;
export declare function useCanvasRuntimeStore<TDocument extends EditorDocument>(options: CanvasEditorInstanceOptions<TDocument>): CanvasRuntimeStore<TDocument>;
export declare function useCanvasRuntimeSelector<TDocument extends EditorDocument, TSelection>(store: CanvasRuntimeStore<TDocument>, selector: (snapshot: CanvasRuntimeSnapshot<TDocument>) => TSelection, isEqual?: (previous: TSelection, next: TSelection) => boolean): TSelection;
