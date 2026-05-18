import type { EngineRenderStats } from '../renderer/types/index.ts'
import type { EngineClock, EngineFrameHandle, EngineFrameInfo } from '../time/index.ts'

/**
 * Stores deterministic fake clock controls for integration tests.
 */
export interface FakeClockHarness {
  /** Stores deterministic clock used by createEngine options. */
  clock: EngineClock
  /** Sets fake clock current timestamp. */
  setNow(value: number): void
}

/**
 * Builds a deterministic clock harness so settle contract timing is testable.
 */
export function createFakeClock(): FakeClockHarness {
  let now = 0

  const clock: EngineClock = {
    now: () => now,
    requestFrame: (_callback: (frame: EngineFrameInfo) => void) => {
      return 0 as EngineFrameHandle
    },
    cancelFrame: (_handle: EngineFrameHandle) => {},
  }

  return {
    clock,
    /**
     * Handles setNow.
     * @param value Timestamp value.
     */
    setNow(value: number) {
      now = value
    },
  }
}

/**
 * Stores captured stats sequence used by debug callback assertions.
 */
export type RecordedStats = EngineRenderStats[]