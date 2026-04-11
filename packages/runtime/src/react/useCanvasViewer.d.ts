import type { EditorDocument } from '@venus/document-core';
import { type CanvasViewerController, type CanvasViewerControllerOptions, type CanvasViewerSnapshot } from '@venus/runtime';
import { type CanvasSnapshotStore } from './store.ts';
/**
 * React adapter for viewer mode (no worker/SAB required).
 *
 * Use this for read-only scenes such as previews, embeds, and catalogs where
 * viewport interaction is needed but edit commands are disabled.
 */
export declare function useCanvasViewer<TDocument extends EditorDocument>(options: CanvasViewerControllerOptions<TDocument>): {
    clearHover: () => void;
    dispatchCommand: (command: import("@venus/runtime/worker").EditorRuntimeCommand) => void;
    fitViewport: () => void;
    panViewport: (deltaX: number, deltaY: number) => void;
    postPointer: (type: "pointermove" | "pointerdown", pointer: import("@venus/shared-memory").PointerState) => void;
    resizeViewport: (width: number, height: number) => void;
    setViewport: (viewport: import("@venus/engine").EngineCanvasViewportState) => void;
    zoomViewport: (nextScale: number, anchor?: import("@venus/engine").Point2D) => void;
    document: TDocument;
    ready: boolean;
    shapes: import("@venus/shared-memory").SceneShapeSnapshot[];
    stats: import("@venus/shared-memory").SceneStats;
    viewport: import("@venus/engine").EngineCanvasViewportState;
};
export type CanvasViewerStore<TDocument extends EditorDocument> = CanvasSnapshotStore<CanvasViewerSnapshot<TDocument>, CanvasViewerController<TDocument>>;
export declare function useCanvasViewerStore<TDocument extends EditorDocument>(options: CanvasViewerControllerOptions<TDocument>): CanvasViewerStore<TDocument>;
export declare function useCanvasViewerSelector<TDocument extends EditorDocument, TSelection>(store: CanvasViewerStore<TDocument>, selector: (snapshot: CanvasViewerSnapshot<TDocument>) => TSelection, isEqual?: (previous: TSelection, next: TSelection) => boolean): TSelection;
