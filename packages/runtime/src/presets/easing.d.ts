import { type EngineAnimationController, type EngineEasingDefinition, type EngineEasingFunction } from '@venus/engine';
export type CubicBezierTuple = readonly [number, number, number, number];
export type PresetEasing = EngineEasingDefinition | CubicBezierTuple;
export interface PresetAnimationControllerOptions {
    idFactory?: () => string;
}
export declare const EASING_PRESET_LINEAR: CubicBezierTuple;
export declare const EASING_PRESET_STANDARD: CubicBezierTuple;
export declare const EASING_PRESET_EMPHASIS: CubicBezierTuple;
/**
 * Resolve policy-level easing definitions to pure easing functions.
 *
 * Why:
 * - keeps cubic-bezier policy out of runtime core
 * - gives app layers one stable resolver for config, presets, and custom
 *   easing callbacks
 */
export declare function resolvePresetEasing(easing: PresetEasing | undefined): EngineEasingFunction;
/**
 * Convenience entry for app layers that want default preset easing behavior
 * without wiring resolver/plumbing every time.
 */
export declare function createPresetAnimationController(options?: PresetAnimationControllerOptions): EngineAnimationController;
