import type { CanvasRuntimeModule } from '@venus/runtime';
export type SelectionSetMode = 'replace' | 'add' | 'remove' | 'toggle' | 'clear';
export type SelectionMarqueeMatchMode = 'intersect' | 'contain';
export type SelectionAltClickBehavior = 'deep-select' | 'subtract' | 'toggle' | 'ignore';
export interface SelectionInputPolicy {
    singleClick: SelectionSetMode;
    shiftClick: SelectionSetMode;
    metaOrCtrlClick: SelectionSetMode;
    altClick: SelectionAltClickBehavior;
}
export interface SelectionMarqueePolicy {
    enabled: boolean;
    defaultMatchMode: SelectionMarqueeMatchMode;
    shiftMatchMode?: SelectionMarqueeMatchMode;
}
export interface CanvasSelectionConfig {
    enabled: boolean;
    input: SelectionInputPolicy;
    marquee: SelectionMarqueePolicy;
    lineHitTolerance: number;
    allowFrameSelection: boolean;
}
export interface CanvasSelectionModule<TSnapshot> extends CanvasRuntimeModule<TSnapshot> {
    kind: 'selection';
    config: CanvasSelectionConfig;
}
export declare const DEFAULT_SELECTION_CONFIG: CanvasSelectionConfig;
export declare function createSelectionModule<TSnapshot>(options?: {
    id?: string;
    config?: Partial<CanvasSelectionConfig>;
}): CanvasSelectionModule<TSnapshot>;
