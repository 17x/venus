export interface RuntimeZoomPreset {
    label: string;
    value: number | 'fit';
}
export type RuntimeZoomDirection = 'in' | 'out';
export type RuntimeZoomInputSource = 'mouse' | 'trackpad';
export declare const RUNTIME_ZOOM_PRESETS: readonly RuntimeZoomPreset[];
/**
 * Resolve the next discrete zoom level using the shared runtime preset ladder.
 * This keeps command/tool/status-bar zoom stepping aligned across apps.
 */
export declare function resolveRuntimeZoomPresetScale(currentScale: number, direction: RuntimeZoomDirection): number | null;
/**
 * Keep mouse-wheel zoom on the same discrete ladder used by command/status-bar
 * actions, while allowing trackpad pinch/zoom to remain continuous.
 */
export declare function resolveRuntimeZoomGestureScale(currentScale: number, proposedScale: number, source: RuntimeZoomInputSource): number;
