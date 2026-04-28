export type EngineFrameHandle = number;
export interface EngineFrameInfo {
    now: number;
    dt: number;
}
export interface EngineClock {
    now(): number;
    requestFrame(cb: (frame: EngineFrameInfo) => void): EngineFrameHandle;
    cancelFrame(handle: EngineFrameHandle): void;
}
interface EngineClockOptions {
    now?: () => number;
}
/**
 * Create the default engine clock abstraction.
 *
 * Keeps browser frame globals behind one contract so runtime and adapters can
 * reuse one scheduling API and tests can override time.
 */
export declare function createSystemEngineClock(options?: EngineClockOptions): EngineClock;
export {};
