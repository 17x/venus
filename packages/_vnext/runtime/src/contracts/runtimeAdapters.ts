/**
 * Describes clock access expected by runtime scheduling and timestamp attribution.
 */
export interface RuntimeClockAdapter {
  /** Returns current monotonic timestamp in milliseconds. */
  now(): number
}

/**
 * Describes frame scheduling primitives used by runtime loop orchestration.
 */
export interface RuntimeFrameAdapter {
  /** Schedules one animation frame callback and returns a handle id. */
  requestFrame(callback: (timestamp: number) => void): number
  /** Cancels a scheduled frame callback by id. */
  cancelFrame(handleId: number): void
}

/**
 * Describes worker bridge creation and termination contract for runtime tasks.
 */
export interface RuntimeWorkerAdapter {
  /** Creates a worker-like endpoint from URL and optional type options. */
  createWorker(scriptUrl: string, options?: {type?: 'classic' | 'module'}): WorkerLike
}

/**
 * Minimal worker-like surface required by runtime worker orchestration.
 */
export interface WorkerLike {
  /** Sends one structured message payload to worker endpoint. */
  postMessage(message: unknown): void
  /** Terminates the worker endpoint and releases resources. */
  terminate(): void
}

/**
 * Describes canvas factory contract consumed by renderer/runtime boundary.
 */
export interface RuntimeCanvasAdapter {
  /** Creates one rendering canvas with optional dimensions. */
  createCanvas(options?: {width?: number; height?: number}): CanvasLike
}

/**
 * Minimal canvas-like shape used by runtime contracts without DOM hard dependency.
 */
export interface CanvasLike {
  /** Pixel width of the canvas-like surface. */
  width: number
  /** Pixel height of the canvas-like surface. */
  height: number
}

/**
 * Describes normalized input subscription contract for runtime interaction layer.
 */
export interface RuntimeInputAdapter {
  /** Subscribes one normalized input event stream callback. */
  subscribe(listener: (event: RuntimeInputEvent) => void): () => void
}

/**
 * Normalized input event envelope for pointer/keyboard/gesture abstraction.
 */
export interface RuntimeInputEvent {
  /** Canonical input event type name. */
  type: string
  /** Monotonic event timestamp in milliseconds. */
  timestamp: number
  /** Event payload fields with adapter-defined schema. */
  payload: Record<string, unknown>
}

/**
 * Describes cursor mutation bridge for optional platform integrations.
 */
export interface RuntimeCursorAdapter {
  /** Sets one cursor token understood by host platform adapter. */
  setCursor(cursor: string): void
}

/**
 * Describes key/value persistence bridge for optional host storage.
 */
export interface RuntimeStorageAdapter {
  /** Reads one string value by key and returns null when absent. */
  getItem(key: string): string | null
  /** Writes one string value by key. */
  setItem(key: string, value: string): void
  /** Removes one value by key. */
  removeItem(key: string): void
}

/**
 * Describes clipboard bridge for optional host copy/paste integrations.
 */
export interface RuntimeClipboardAdapter {
  /** Reads text from clipboard-like host API. */
  readText(): Promise<string>
  /** Writes text into clipboard-like host API. */
  writeText(text: string): Promise<void>
}

/**
 * Groups all runtime adapter contracts used to boot runtime in host environments.
 */
export interface RuntimeAdapterSet {
  /** Frame scheduling adapter for main loop integration. */
  frame: RuntimeFrameAdapter
  /** Monotonic clock adapter for timestamps and diagnostics. */
  clock: RuntimeClockAdapter
  /** Worker adapter for background runtime operations. */
  worker: RuntimeWorkerAdapter
  /** Canvas factory adapter for rendering surface creation. */
  canvas: RuntimeCanvasAdapter
  /** Input adapter for normalized interaction events. */
  input: RuntimeInputAdapter
  /** Cursor adapter for host cursor state bridge. */
  cursor?: RuntimeCursorAdapter
  /** Storage adapter for optional persistence capabilities. */
  storage?: RuntimeStorageAdapter
  /** Clipboard adapter for optional copy/paste capabilities. */
  clipboard?: RuntimeClipboardAdapter
}
