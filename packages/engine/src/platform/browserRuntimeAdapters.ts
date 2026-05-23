import type {
  CanvasLike,
  RuntimeAdapterSet,
  RuntimeInputAdapter,
  RuntimeInputEvent,
  WorkerLike,
} from './runtimeAdapters.contract'

/**
 * Describes browser-side capabilities required to build runtime adapter boundaries.
 */
export interface BrowserRuntimeBoundary {
  /** Returns monotonic timestamp in milliseconds. */
  now(): number
  /** Schedules one animation frame callback and returns the handle id. */
  requestFrame(callback: (timestamp: number) => void): number
  /** Cancels one scheduled animation frame callback by id. */
  cancelFrame(handleId: number): void
  /** Creates one worker-like endpoint for runtime background tasks. */
  createWorker(scriptUrl: string, options?: {type?: 'classic' | 'module'}): WorkerLike
  /** Creates one canvas-like surface for rendering adapter handoff. */
  createCanvas(options?: {width?: number; height?: number}): CanvasLike
  /** Subscribes one normalized input stream and returns unsubscribe callback. */
  subscribeInput(listener: (event: RuntimeInputEvent) => void): () => void
  /** Bridges host cursor mutation. */
  setCursor(cursor: string): void
  /** Reads one storage value by key; returns null when absent. */
  getStorageItem(key: string): string | null
  /** Writes one storage value by key. */
  setStorageItem(key: string, value: string): void
  /** Removes one storage value by key. */
  removeStorageItem(key: string): void
  /** Reads text from host clipboard. */
  readClipboardText(): Promise<string>
  /** Writes text to host clipboard. */
  writeClipboardText(text: string): Promise<void>
}

/**
 * Creates a browser-scoped runtime adapter set from explicit browser boundary hooks.
 * @param boundary Browser boundary dependency bag used to avoid direct global coupling.
 * @returns Runtime adapter set wired to browser-capable boundary hooks.
 */
export function createBrowserRuntimeAdapterSet(boundary: BrowserRuntimeBoundary): RuntimeAdapterSet {
  const inputAdapter: RuntimeInputAdapter = {
    subscribe: (listener) => boundary.subscribeInput(listener),
  }

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
    input: inputAdapter,
    cursor: {
      setCursor: (cursor) => boundary.setCursor(cursor),
    },
    storage: {
      getItem: (key) => boundary.getStorageItem(key),
      setItem: (key, value) => boundary.setStorageItem(key, value),
      removeItem: (key) => boundary.removeStorageItem(key),
    },
    clipboard: {
      readText: () => boundary.readClipboardText(),
      writeText: (text) => boundary.writeClipboardText(text),
    },
  }
}
