import type { EngineFrameInfo } from '../time/index.ts';
export type EngineAnimationId = string;
export type EngineEasingName = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
export type EngineEasingFunction = (t: number) => number;
export type EngineEasingDefinition = EngineEasingName | EngineEasingFunction;
export interface EngineAnimationSpec<T = number> {
    id?: EngineAnimationId;
    from: T;
    to: T;
    duration: number;
    easing?: EngineEasingDefinition;
    onUpdate: (value: T, frame: EngineFrameInfo) => void;
    onComplete?: () => void;
    interpolate?: (from: T, to: T, progress: number) => T;
}
export interface EngineAnimationController {
    start<T>(spec: EngineAnimationSpec<T>): EngineAnimationId;
    stop(id: EngineAnimationId): void;
    stopAll(): void;
    tick(frame: EngineFrameInfo): void;
}
interface EngineAnimationControllerOptions {
    resolveEasing?: (easing: EngineEasingDefinition | undefined) => EngineEasingFunction;
    idFactory?: () => EngineAnimationId;
}
export declare function createEngineAnimationController(options?: EngineAnimationControllerOptions): EngineAnimationController;
export {};
