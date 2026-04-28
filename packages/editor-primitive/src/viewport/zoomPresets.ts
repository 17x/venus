/**
 * Defines one discrete zoom preset entry used by UI and command stepping.
 */
export interface RuntimeZoomPreset {
  /** Stores display label shown in zoom selector surfaces. */
  label: string
  /** Stores preset scale value or fit token. */
  value: number | 'fit'
}

/**
 * Defines zoom preset step direction.
 */
export type RuntimeZoomDirection = 'in' | 'out'

/**
 * Defines normalized zoom input source used by gesture policy.
 */
export type RuntimeZoomInputSource = 'mouse' | 'trackpad'

/**
 * Stores shared zoom ladder used by tool, command, and status-bar interactions.
 */
export const RUNTIME_ZOOM_PRESETS: readonly RuntimeZoomPreset[] = [
  {label: '64000%', value: 640},
  {label: '51000%', value: 510},
  {label: '34000%', value: 340},
  {label: '25500%', value: 255},
  {label: '17000%', value: 170},
  {label: '12750%', value: 127.5},
  {label: '8500%', value: 85},
  {label: '6400%', value: 64},
  {label: '4800%', value: 48},
  {label: '3200%', value: 32},
  {label: '2400%', value: 24},
  {label: '1600%', value: 16},
  {label: '1200%', value: 12},
  {label: '800%', value: 8},
  {label: '600%', value: 6},
  {label: '400%', value: 4},
  {label: '300%', value: 3},
  {label: '200%', value: 2},
  {label: '150%', value: 1.5},
  {label: '100%', value: 1},
  {label: '66.67%', value: 0.6667},
  {label: '50%', value: 0.5},
  {label: '33.33%', value: 0.3333},
  {label: '25%', value: 0.25},
  {label: '16.67%', value: 0.1667},
  {label: '12.5%', value: 0.125},
  {label: '8.33%', value: 0.0833},
  {label: '6.25%', value: 0.0625},
  {label: '4.17%', value: 0.0417},
  {label: '3.13%', value: 0.0313},
  {label: 'Fit window', value: 'fit'},
] as const

const RUNTIME_NUMERIC_ZOOM_PRESETS = RUNTIME_ZOOM_PRESETS
  .filter((preset): preset is RuntimeZoomPreset & {value: number} => typeof preset.value === 'number')
  .map((preset) => preset.value)

/**
 * Resolves next discrete zoom preset from current scale and direction.
 */
export function resolveRuntimeZoomPresetScale(
  currentScale: number,
  direction: RuntimeZoomDirection,
): number | null {
  if (direction === 'in') {
    return [...RUNTIME_NUMERIC_ZOOM_PRESETS].reverse().find((value) => value > currentScale) ?? null
  }

  return RUNTIME_NUMERIC_ZOOM_PRESETS.find((value) => value < currentScale) ?? null
}

/**
 * Resolves gesture scale policy: mouse follows presets, trackpad remains continuous.
 */
export function resolveRuntimeZoomGestureScale(
  currentScale: number,
  proposedScale: number,
  source: RuntimeZoomInputSource,
): number {
  if (source === 'trackpad') {
    return proposedScale
  }

  if (proposedScale > currentScale) {
    return resolveRuntimeZoomPresetScale(currentScale, 'in') ?? currentScale
  }

  if (proposedScale < currentScale) {
    return resolveRuntimeZoomPresetScale(currentScale, 'out') ?? currentScale
  }

  return currentScale
}

