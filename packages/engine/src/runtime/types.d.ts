import type { EngineAnimationController } from '../animation/index.ts';
import type { EngineRenderer } from '../renderer/types.ts';
import type { EngineClock } from '../time/index.ts';
export interface EngineRuntime {
    clock: EngineClock;
    animations: EngineAnimationController;
    renderer: EngineRenderer;
}
