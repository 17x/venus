import {
  buildEngineReplayTiles,
  type BuildEngineReplayTilesOptions,
  type EngineReplayTile,
} from './replay.ts'

export interface EngineReplayViewportState {
  viewportWidth: number
  viewportHeight: number
  offsetX: number
  offsetY: number
  scale: number
}

export interface EngineReplayRenderRequest<TScenePayload = unknown> {
  type: 'render'
  requestId: number
  width: number
  height: number
  tileSize: number
  viewport: EngineReplayViewportState
  scene: TScenePayload
}

export interface EngineReplayCancelRequest {
  type: 'cancel'
  requestId: number
}

export type EngineReplayWorkerMessage<TScenePayload = unknown> =
  | EngineReplayRenderRequest<TScenePayload>
  | EngineReplayCancelRequest

export interface EngineReplayStartEvent {
  type: 'start'
  requestId: number
  width: number
  height: number
}

export interface EngineReplayTileEvent {
  type: 'tile'
  requestId: number
  x: number
  y: number
  width: number
  height: number
  bitmap: ImageBitmap
}

export interface EngineReplayDoneEvent {
  type: 'done'
  requestId: number
}

export interface EngineReplayErrorEvent {
  type: 'error'
  requestId: number
  error: string
}

export type EngineReplayWorkerEvent =
  | EngineReplayStartEvent
  | EngineReplayTileEvent
  | EngineReplayDoneEvent
  | EngineReplayErrorEvent

export interface CreateEngineReplayCoordinatorOptions<TScenePayload = unknown> {
  renderFrameBitmap: (request: EngineReplayRenderRequest<TScenePayload>) => Promise<ImageBitmap | null>
  postEvent: (event: EngineReplayWorkerEvent, transfer?: Transferable[]) => void
  buildTiles?: (options: BuildEngineReplayTilesOptions) => EngineReplayTile[]
  createTileBitmap?: (frameBitmap: ImageBitmap, tile: EngineReplayTile) => Promise<ImageBitmap>
}

const DEFAULT_CREATE_TILE_BITMAP = async (
  frameBitmap: ImageBitmap,
  tile: EngineReplayTile,
) => {
  if (typeof createImageBitmap !== 'function') {
    throw new Error('createImageBitmap is required for replay tile extraction')
  }

  return createImageBitmap(
    frameBitmap,
    tile.x,
    tile.y,
    tile.width,
    tile.height,
  )
}

export function createEngineReplayCoordinator<TScenePayload = unknown>(
  options: CreateEngineReplayCoordinatorOptions<TScenePayload>,
) {
  let activeRequestId = 0
  const buildTiles = options.buildTiles ?? buildEngineReplayTiles
  const createTileBitmap = options.createTileBitmap ?? DEFAULT_CREATE_TILE_BITMAP

  const cancel = (requestId: number) => {
    activeRequestId = Math.max(activeRequestId, requestId)
  }

  const handleMessage = (message: EngineReplayWorkerMessage<TScenePayload>) => {
    if (message.type === 'cancel') {
      cancel(message.requestId)
      return
    }

    activeRequestId = message.requestId
    void processRenderRequest(message)
  }

  const processRenderRequest = async (request: EngineReplayRenderRequest<TScenePayload>) => {
    const requestId = request.requestId
    let frameBitmap: ImageBitmap | null = null

    try {
      frameBitmap = await options.renderFrameBitmap(request)
      if (!frameBitmap) {
        options.postEvent({
          type: 'error',
          requestId,
          error: 'Replay frame bitmap is unavailable',
        })
        return
      }

      if (activeRequestId !== requestId) {
        frameBitmap.close()
        return
      }

      const tiles = buildTiles({
        width: request.width,
        height: request.height,
        tileSize: request.tileSize,
      })

      options.postEvent({
        type: 'start',
        requestId,
        width: request.width,
        height: request.height,
      })

      for (const tile of tiles) {
        if (activeRequestId !== requestId) {
          frameBitmap.close()
          return
        }

        const bitmap = await createTileBitmap(frameBitmap, tile)
        options.postEvent({
          type: 'tile',
          requestId,
          x: tile.x,
          y: tile.y,
          width: tile.width,
          height: tile.height,
          bitmap,
        }, [bitmap])
      }

      frameBitmap.close()
      if (activeRequestId === requestId) {
        options.postEvent({type: 'done', requestId})
      }
    } catch (error) {
      if (frameBitmap) {
        frameBitmap.close()
      }

      options.postEvent({
        type: 'error',
        requestId,
        error: error instanceof Error ? error.message : 'Replay request failed',
      })
    }
  }

  return {
    cancel,
    handleMessage,
  }
}