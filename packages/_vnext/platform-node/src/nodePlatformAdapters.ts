/**
 * Describes one node-side frame scheduler boundary.
 */
export interface NodeFrameScheduler {
  /** Schedules one frame callback and returns numeric handle id. */
  requestFrame: (callback: (timestampMs: number) => void) => number
  /** Cancels one scheduled frame callback by id. */
  cancelFrame: (handleId: number) => void
}

/**
 * Describes one node platform adapter bundle.
 */
export interface NodePlatformAdapters {
  /** Node frame scheduler adapter. */
  frame: NodeFrameScheduler
  /** Monotonic clock function for node/headless runtime timestamps. */
  now: () => number
  /** Creates one worker-like endpoint from script URL. */
  createWorker: (
    scriptUrl: string,
    options?: {type?: 'classic' | 'module'},
  ) => {postMessage: (payload: unknown) => void; terminate: () => void}
  /** Creates one canvas-like object for headless rendering. */
  createCanvas: (options?: {width?: number; height?: number}) => {width: number; height: number}
  /** In-memory storage bridge. */
  storage: {
    getItem: (key: string) => string | null
    setItem: (key: string, value: string) => void
    removeItem: (key: string) => void
  }
  /** Inert clipboard bridge for node/headless contexts. */
  clipboard: {
    readText: () => Promise<string>
    writeText: (text: string) => Promise<void>
  }
}

/**
 * Creates node/headless platform adapters from host hooks.
 * @param host Node host hook bag used by headless platform boundaries.
 * @returns Node platform adapter bundle.
 */
export function createNodePlatformAdapters(host: {
  requestFrame: (callback: (timestampMs: number) => void) => number
  cancelFrame: (handleId: number) => void
  now: () => number
  createWorker: (
    scriptUrl: string,
    options?: {type?: 'classic' | 'module'},
  ) => {postMessage: (payload: unknown) => void; terminate: () => void}
  createCanvas: (options?: {width?: number; height?: number}) => {width: number; height: number}
}): NodePlatformAdapters {
  const storageState = new Map<string, string>()

  return {
    frame: {
      requestFrame: (callback) => host.requestFrame(callback),
      cancelFrame: (handleId) => host.cancelFrame(handleId),
    },
    now: () => host.now(),
    createWorker: (scriptUrl, options) => host.createWorker(scriptUrl, options),
    createCanvas: (options) => host.createCanvas(options),
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
