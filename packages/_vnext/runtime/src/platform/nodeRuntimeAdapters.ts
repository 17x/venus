import type {
  CanvasLike,
  RuntimeAdapterSet,
  RuntimeInputEvent,
  WorkerLike,
} from '../contracts/runtimeAdapters'

/**
 * Describes node/headless capabilities used to build runtime adapter boundaries.
 */
export interface NodeRuntimeBoundary {
  /** Returns monotonic timestamp in milliseconds. */
  now(): number
  /** Schedules one frame callback and returns a numeric handle id. */
  requestFrame(callback: (timestamp: number) => void): number
  /** Cancels one scheduled frame callback by id. */
  cancelFrame(handleId: number): void
  /** Creates one worker-like endpoint for headless runtime background tasks. */
  createWorker(scriptUrl: string, options?: {type?: 'classic' | 'module'}): WorkerLike
  /** Creates one canvas-like object for headless rendering integration. */
  createCanvas(options?: {width?: number; height?: number}): CanvasLike
}

/**
 * Creates a node/headless runtime adapter set with explicit platform boundaries.
 * @param boundary Node boundary dependency bag for headless-safe adapter wiring.
 * @returns Runtime adapter set that avoids direct browser API coupling.
 */
export function createNodeRuntimeAdapterSet(boundary: NodeRuntimeBoundary): RuntimeAdapterSet {
  const storageState = new Map<string, string>()

  return {
    frame: {
      requestFrame: (callback) => boundary.requestFrame(callback),
      cancelFrame: (handleId) => boundary.cancelFrame(handleId),
    },
    clock: {
      now: () => boundary.now(),
    },
    worker: {
      createWorker: (scriptUrl, options) => boundary.createWorker(scriptUrl, options),
    },
    canvas: {
      createCanvas: (options) => boundary.createCanvas(options),
    },
    input: {
      subscribe: (_listener: (event: RuntimeInputEvent) => void) => {
        // Headless runtime keeps an inert input bridge until host adapters are attached.
        return () => {}
      },
    },
    storage: {
      getItem: (key) => storageState.get(key) ?? null,
      setItem: (key, value) => {
        storageState.set(key, value)
      },
      removeItem: (key) => {
        storageState.delete(key)
      },
    },
    clipboard: {
      readText: async () => '',
      writeText: async (_text) => {},
    },
  }
}
