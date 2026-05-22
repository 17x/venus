/**
 * Describes one browser-side frame scheduler boundary.
 */
export interface BrowserFrameScheduler {
  /** Schedules one animation frame callback and returns handle id. */
  requestFrame: (callback: (timestampMs: number) => void) => number
  /** Cancels one scheduled animation frame callback by id. */
  cancelFrame: (handleId: number) => void
}

/**
 * Describes one browser storage bridge.
 */
export interface BrowserStorageBridge {
  /** Reads one storage value by key and returns null when absent. */
  getItem: (key: string) => string | null
  /** Writes one storage value by key. */
  setItem: (key: string, value: string) => void
  /** Removes one storage value by key. */
  removeItem: (key: string) => void
}

/**
 * Describes one browser clipboard bridge.
 */
export interface BrowserClipboardBridge {
  /** Reads text from browser clipboard API. */
  readText: () => Promise<string>
  /** Writes text to browser clipboard API. */
  writeText: (text: string) => Promise<void>
}

/**
 * Describes one browser platform adapter bundle.
 */
export interface BrowserPlatformAdapters {
  /** Browser frame scheduler adapter. */
  frame: BrowserFrameScheduler
  /** Monotonic clock function for browser runtime timestamps. */
  now: () => number
  /** Creates one worker endpoint from script URL. */
  createWorker: (scriptUrl: string, options?: {type?: 'classic' | 'module'}) => Worker
  /** Creates one canvas element with optional dimensions. */
  createCanvas: (options?: {width?: number; height?: number}) => HTMLCanvasElement
  /** Sets browser cursor token on host target. */
  setCursor: (cursor: string) => void
  /** Browser storage bridge adapter. */
  storage: BrowserStorageBridge
  /** Browser clipboard bridge adapter. */
  clipboard: BrowserClipboardBridge
}

/**
 * Creates browser platform adapters from explicit browser globals.
 * @param host Host browser capability bag used by platform adapter boundaries.
 * @returns Browser platform adapter bundle.
 */
export function createBrowserPlatformAdapters(host: {
  requestAnimationFrame: (callback: (timestampMs: number) => void) => number
  cancelAnimationFrame: (handleId: number) => void
  now: () => number
  createWorker: (scriptUrl: string, options?: {type?: 'classic' | 'module'}) => Worker
  createCanvas: (options?: {width?: number; height?: number}) => HTMLCanvasElement
  setCursor: (cursor: string) => void
  getStorageItem: (key: string) => string | null
  setStorageItem: (key: string, value: string) => void
  removeStorageItem: (key: string) => void
  readClipboardText: () => Promise<string>
  writeClipboardText: (text: string) => Promise<void>
}): BrowserPlatformAdapters {
  return {
    frame: {
      requestFrame: (callback) => host.requestAnimationFrame(callback),
      cancelFrame: (handleId) => host.cancelAnimationFrame(handleId),
    },
    now: () => host.now(),
    createWorker: (scriptUrl, options) => host.createWorker(scriptUrl, options),
    createCanvas: (options) => host.createCanvas(options),
    setCursor: (cursor) => host.setCursor(cursor),
    storage: {
      getItem: (key) => host.getStorageItem(key),
      setItem: (key, value) => host.setStorageItem(key, value),
      removeItem: (key) => host.removeStorageItem(key),
    },
    clipboard: {
      readText: () => host.readClipboardText(),
      writeText: (text) => host.writeClipboardText(text),
    },
  }
}
