import type { CanvasRuntimeModule } from '@venus/runtime';
export type SnapAxis = 'x' | 'y' | 'angle';
export type SnapTargetKind = 'edge-min' | 'edge-max' | 'center' | 'corner' | 'vertex' | 'parallel' | 'grid' | 'angle';
/**
 * Semantic snap match data. Keep this model visual-agnostic so UI layers can
 * draw custom hint styles without changing snap computation contracts.
 */
export interface SnapMatch {
    axis: SnapAxis;
    kind: SnapTargetKind;
    sourceId?: string;
    sourceType?: string;
    targetId?: string;
    targetType?: string;
    value: number;
    delta: number;
}
/**
 * Optional hint payload generated from matches. Consumers may ignore this and
 * render their own visuals from `SnapMatch[]`.
 */
export interface SnapHintDescriptor {
    id: string;
    axis: SnapAxis;
    kind: 'line' | 'point' | 'angle';
    value: number;
}
export interface SnapComputationResult {
    offsetX: number;
    offsetY: number;
    angleDelta?: number;
    matches: SnapMatch[];
}
export interface CanvasSnapConfig {
    enabled: boolean;
    tolerancePx: number;
    detachPx: number;
    enableBounds: boolean;
    enableCorners: boolean;
    enableVertices: boolean;
    enableGrid: boolean;
    enableAngle: boolean;
}
export interface CanvasSnapModule<TSnapshot> extends CanvasRuntimeModule<TSnapshot> {
    kind: 'snap';
    config: CanvasSnapConfig;
}
export declare const SNAP_PRESET_OFF: CanvasSnapConfig;
export declare const SNAP_PRESET_BOUNDS: CanvasSnapConfig;
export declare const SNAP_PRESET_PRECISION: CanvasSnapConfig;
export declare function createSnapModule<TSnapshot>(options?: {
    id?: string;
    config?: Partial<CanvasSnapConfig>;
    preset?: 'off' | 'bounds' | 'precision';
}): CanvasSnapModule<TSnapshot>;
