/// <reference lib="webworker" />

import {
  createCanvas2DEngineRenderer,
  createEngineReplayCoordinator,
  resolveEngineViewportState,
  type EngineRenderFrame,
  type EngineRenderQuality,
  type EngineReplayRenderRequest,
  type EngineReplayWorkerEvent,
  type EngineReplayWorkerMessage,
} from '@vector/runtime/engine'
import {
  createEngineSceneFromRuntimeSnapshot,
  type CreateEngineSceneFromRuntimeSnapshotOptions,
} from '@vector/runtime/presets'

type ReplayScenePayload = CreateEngineSceneFromRuntimeSnapshotOptions
interface ReplayCanvasEngine {
  loadScene: (scene: ReturnType<typeof createEngineSceneFromRuntimeSnapshot>) => void
  setViewport: (viewport: EngineReplayRenderRequest['viewport']) => void
  resize: (size: {viewportWidth: number; viewportHeight: number; outputWidth: number; outputHeight: number}) => void
  setQuality: (quality: EngineRenderQuality) => void
  renderFrame: () => Promise<void>
}

let replayEngine: ReplayCanvasEngine | null = null
let replayCanvas: OffscreenCanvas | null = null

const replayCoordinator = createEngineReplayCoordinator<ReplayScenePayload>({
  renderFrameBitmap: renderReplayFrameBitmap,
  // Coordinator emits replay worker events, not inbound worker messages.
  postEvent: (message: EngineReplayWorkerEvent, transfer?: Transferable[]) => {
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
  replayCanvas.width = Math.max(1, request.width)
  replayCanvas.height = Math.max(1, request.height)
  engine.resize({
    viewportWidth: request.width,
    viewportHeight: request.height,
    outputWidth: replayCanvas.width,
    outputHeight: replayCanvas.height,
  })
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
    replayEngine = createReplayCanvasEngine(replayCanvas)
  }

  return replayEngine
}

function createReplayCanvasEngine(canvas: OffscreenCanvas): ReplayCanvasEngine {
  const renderer = createCanvas2DEngineRenderer({
    id: 'engine.replay.canvas2d',
    canvas,
    manageCanvasSize: false,
    enableCulling: true,
    clearColor: '#f3f4f6',
  })
  const renderContext: EngineRenderFrame['context'] = {
    quality: 'full',
    pixelRatio: 1,
    loader: {
      resolveImage: () => null,
    },
  }
  const emptyDocument = {
    id: 'replay-empty',
    name: 'replay-empty',
    width: 1,
    height: 1,
    shapes: [],
  } as unknown as ReplayScenePayload['document']
  let scene = createEngineSceneFromRuntimeSnapshot({
    document: emptyDocument,
    shapes: [],
    revision: 0,
  })
  let viewport = resolveEngineViewportState({
    viewportWidth: canvas.width,
    viewportHeight: canvas.height,
    offsetX: 48,
    offsetY: 48,
    scale: 1,
  })

  return {
    loadScene(nextScene) {
      scene = nextScene
    },
    setViewport(nextViewport) {
      viewport = resolveEngineViewportState(nextViewport)
    },
    resize(size) {
      renderer.resize?.(size)
      viewport = resolveEngineViewportState({
        viewportWidth: size.viewportWidth,
        viewportHeight: size.viewportHeight,
        offsetX: viewport.offsetX,
        offsetY: viewport.offsetY,
        scale: viewport.scale,
      })
    },
    setQuality(quality) {
      renderContext.quality = quality
    },
    async renderFrame() {
      await Promise.resolve(renderer.render({
        scene,
        viewport,
        context: renderContext,
      }))
    },
  }
}
