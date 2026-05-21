import type { EngineFrameCallback, EngineRuntimeAdapter } from "../api/public-types";

/**
 * Runtime adapter control surface used by deterministic scheduling tests.
 */
export interface RuntimeAdapterTestDouble {
  /**
   * Adapter implementation passed to engine/runtime constructors.
   */
  adapter: EngineRuntimeAdapter;
  /**
   * Runs the next pending frame callback with a test-controlled timestamp.
   */
  runNextFrame: (timestampMs: number) => boolean;
  /**
   * Returns the number of active frame callbacks currently queued.
   */
  getPendingFrameCount: () => number;
  /**
   * Returns the number of cancel calls issued by runtime logic.
   */
  getCancelCount: () => number;
}

/**
 * Creates a deterministic runtime adapter with explicit control over frame execution order.
 * @returns Runtime adapter test double with manual frame and cancellation control.
 */
export function createRuntimeAdapterTestDouble(): RuntimeAdapterTestDouble {
  let nextHandle = 1;
  const pendingCallbacks = new Map<number, EngineFrameCallback>();
  const requestOrder: number[] = [];
  let cancelCount = 0;

  /**
   * Registers a callback and returns a synthetic frame handle.
   * @param callback Frame callback provided by runtime code under test.
   */
  function requestFrame(callback: EngineFrameCallback): number {
    const handle = nextHandle;
    nextHandle += 1;
    pendingCallbacks.set(handle, callback);
    requestOrder.push(handle);
    return handle;
  }

  /**
   * Cancels a pending callback and records cancellation requests.
   * @param handle Frame handle previously returned by requestFrame.
   */
  function cancelFrame(handle: number): void {
    cancelCount += 1;
    pendingCallbacks.delete(handle);
  }

  /**
   * Runs the next active callback in FIFO request order.
   * @param timestampMs Timestamp forwarded to the selected frame callback.
   */
  function runNextFrame(timestampMs: number): boolean {
    while (requestOrder.length > 0) {
      const nextHandleInOrder = requestOrder.shift();
      if (typeof nextHandleInOrder !== "number") {
        return false;
      }
      const callback = pendingCallbacks.get(nextHandleInOrder);
      if (!callback) {
        continue;
      }
      pendingCallbacks.delete(nextHandleInOrder);
      callback(timestampMs);
      return true;
    }
    return false;
  }

  /**
   * Returns the number of currently pending callbacks.
   */
  function getPendingFrameCount(): number {
    return pendingCallbacks.size;
  }

  /**
   * Returns the number of cancellation requests observed by the adapter.
   */
  function getCancelCount(): number {
    return cancelCount;
  }

  return {
    adapter: {
      requestFrame,
      cancelFrame,
      now: () => 0,
    },
    runNextFrame,
    getPendingFrameCount,
    getCancelCount,
  };
}
