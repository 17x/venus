import { type BuildEngineReplayTilesOptions, type EngineReplayTile } from './replay.ts';
export interface EngineReplayViewportState {
    viewportWidth: number;
    viewportHeight: number;
    offsetX: number;
    offsetY: number;
    scale: number;
}
export interface EngineReplayRenderRequest<TScenePayload = unknown> {
    type: 'render';
    requestId: number;
    width: number;
    height: number;
    tileSize: number;
    viewport: EngineReplayViewportState;
    scene: TScenePayload;
}
export interface EngineReplayCancelRequest {
    type: 'cancel';
    requestId: number;
}
export type EngineReplayWorkerMessage<TScenePayload = unknown> = EngineReplayRenderRequest<TScenePayload> | EngineReplayCancelRequest;
export interface EngineReplayStartEvent {
    type: 'start';
    requestId: number;
    width: number;
    height: number;
}
export interface EngineReplayTileEvent {
    type: 'tile';
    requestId: number;
    x: number;
    y: number;
    width: number;
    height: number;
    bitmap: ImageBitmap;
}
export interface EngineReplayDoneEvent {
    type: 'done';
    requestId: number;
}
export interface EngineReplayErrorEvent {
    type: 'error';
    requestId: number;
    error: string;
}
export type EngineReplayWorkerEvent = EngineReplayStartEvent | EngineReplayTileEvent | EngineReplayDoneEvent | EngineReplayErrorEvent;
export interface CreateEngineReplayCoordinatorOptions<TScenePayload = unknown> {
    renderFrameBitmap: (request: EngineReplayRenderRequest<TScenePayload>) => Promise<ImageBitmap | null>;
    postEvent: (event: EngineReplayWorkerEvent, transfer?: Transferable[]) => void;
    buildTiles?: (options: BuildEngineReplayTilesOptions) => EngineReplayTile[];
    createTileBitmap?: (frameBitmap: ImageBitmap, tile: EngineReplayTile) => Promise<ImageBitmap>;
}
export declare function createEngineReplayCoordinator<TScenePayload = unknown>(options: CreateEngineReplayCoordinatorOptions<TScenePayload>): {
    cancel: (requestId: number) => void;
    handleMessage: (message: EngineReplayWorkerMessage<TScenePayload>) => void;
};
