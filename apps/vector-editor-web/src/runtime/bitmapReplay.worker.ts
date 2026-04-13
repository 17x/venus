/// <reference lib="webworker" />

import {
  createEngine,
  createEngineReplayCoordinator,
  type Engine,
  type EngineReplayRenderRequest,
  type EngineReplayWorkerMessage,
} from '@venus/runtime/engine'
import {
  createEngineSceneFromRuntimeSnapshot,
  type CreateEngineSceneFromRuntimeSnapshotOptions,
} from '@venus/runtime/presets'

type ReplayScenePayload = CreateEngineSceneFromRuntimeSnapshotOptions
let replayEngine: Engine | null = null
let replayCanvas: OffscreenCanvas | null = null

const replayCoordinator = createEngineReplayCoordinator<ReplayScenePayload>({
  renderFrameBitmap: renderReplayFrameBitmap,
  postEvent: (message, transfer) => {
    if (transfer && transfer.length > 0) {
      postMessage(message, transfer)
      return
    }
    postMessage(message)
  },
})

self.onmessage = (event: MessageEvent<EngineReplayWorkerMessage<ReplayScenePayload>>) => {
  replayCoordinator.handleMessage(event.data)
}

async function renderReplayFrameBitmap(request: EngineReplayRenderRequest<ReplayScenePayload>) {
  const engine = ensureReplayEngine(request.width, request.height)
  if (!engine || !replayCanvas) {
    return null
  }

  engine.setQuality('full')
  engine.resize(request.width, request.height)
  engine.loadScene(createEngineSceneFromRuntimeSnapshot(request.scene))
  engine.setViewport(request.viewport)
  await engine.renderFrame()

  return replayCanvas.transferToImageBitmap()
}

function ensureReplayEngine(width: number, height: number) {
  if (typeof OffscreenCanvas === 'undefined') {
    return null
  }

  if (!replayCanvas) {
    replayCanvas = new OffscreenCanvas(Math.max(1, width), Math.max(1, height))
  }

  if (!replayEngine) {
    replayEngine = createEngine({
      canvas: replayCanvas,
      backend: 'canvas2d',
      performance: {
        culling: true,
      },
      render: {
        quality: 'full',
        canvasClearColor: '#f3f4f6',
      },
      resource: {
        loader: {
          resolveImage: () => null,
        },
      },
    })
  }

  return replayEngine
}
