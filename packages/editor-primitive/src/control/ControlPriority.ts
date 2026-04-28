/**
 * Defines standard overlay control priority bands per docs/task/overlay.md §8.
 *
 * Higher numeric values win during pointer hit resolution. Numeric gaps leave
 * room for product or element-specific extensions to slot between bands.
 */
export const CONTROL_PRIORITY = {
  /** Reserved for canvas/empty fallback. */
  canvas: 0,
  /** Stores hover-element priority. */
  hoverElement: 100,
  /** Stores selected marquee body priority. */
  marqueeBody: 200,
  /** Stores rotate handle priority. */
  rotate: 300,
  /** Stores resize edge handle priority. */
  resizeEdge: 400,
  /** Stores resize corner handle priority. */
  resizeCorner: 500,
  /** Stores arc/angle handle priority. */
  arcAngle: 600,
  /** Stores rect corner radius handle priority. */
  rectRadius: 700,
  /** Stores element-specific custom handle priority. */
  elementSpecific: 800,
  /** Stores path tangent handle priority. */
  pathTangent: 900,
  /** Stores path anchor handle priority. */
  pathAnchor: 1000,
} as const

/**
 * Defines numeric priority value used by overlay controls.
 *
 * Custom integer literals are accepted so element-specific elements can
 * provide finely-tuned values without modifying core enums.
 */
export type ControlPriority = number

/**
 * Defines union of named priority tokens for ergonomic call-sites.
 */
export type ControlPriorityToken = keyof typeof CONTROL_PRIORITY

/**
 * Resolves a priority token into a numeric value.
 */
export function resolveControlPriority(token: ControlPriorityToken): ControlPriority {
  return CONTROL_PRIORITY[token]
}
