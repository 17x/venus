import {
  getBoundingRectFromBezierPoints,
  type BezierPoint,
  type Point,
} from '../../model/index.ts'

/**
 * Builds the hero preview SVG data URL used by the default mock document asset.
 */
export function createHeroImageDataUrl() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="520" height="320" viewBox="0 0 520 320">
      <defs>
        <linearGradient id="heroBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0ea5e9" />
          <stop offset="100%" stop-color="#1d4ed8" />
        </linearGradient>
      </defs>
      <rect width="520" height="320" rx="30" fill="url(#heroBg)" />
      <circle cx="420" cy="66" r="44" fill="rgba(255,255,255,0.2)" />
      <path d="M0 224 C 94 176, 196 342, 520 184 L 520 320 L 0 320 Z" fill="rgba(15,23,42,0.24)" />
      <text x="30" y="126" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="#ffffff">Venus Studio</text>
      <text x="30" y="168" font-family="Arial, sans-serif" font-size="17" fill="rgba(255,255,255,0.92)">Compose. Align. Draw. Ship.</text>
    </svg>
  `.trim()

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/**
 * Builds the accent preview SVG data URL used by the secondary mock image asset.
 */
export function createAccentImageDataUrl() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="340" height="220" viewBox="0 0 340 220">
      <defs>
        <linearGradient id="panelBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fb7185" />
          <stop offset="100%" stop-color="#be123c" />
        </linearGradient>
      </defs>
      <rect width="340" height="220" rx="22" fill="#0f172a" />
      <rect x="18" y="18" width="304" height="184" rx="16" fill="url(#panelBg)" />
      <path d="M30 150 L 84 116 L 140 142 L 190 110 L 236 146 L 306 122 L 306 186 L 30 186 Z" fill="rgba(15,23,42,0.2)" />
      <text x="40" y="84" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#fff1f2">Mood Board</text>
    </svg>
  `.trim()

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/**
 * Produces a 10-point star polygon in document coordinates for mock shape seeding.
 * @param x Left position of the containing bounds.
 * @param y Top position of the containing bounds.
 * @param width Width of the containing bounds.
 * @param height Height of the containing bounds.
 */
export function createStarPoints(x: number, y: number, width: number, height: number) {
  const centerX = x + width / 2
  const centerY = y + height / 2
  const outerRadius = Math.min(width, height) / 2
  const innerRadius = outerRadius * 0.46

  return Array.from({length: 10}, (_, index) => {
    const angle = -Math.PI / 2 + (Math.PI / 5) * index
    const radius = index % 2 === 0 ? outerRadius : innerRadius
    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    }
  })
}

/**
 * Computes one deterministic bezier ribbon and its bounds for the path demo shape.
 */
function createBezierRibbonPath() {
  const points: Point[] = [
    {x: 120, y: 516},
    {x: 224, y: 454},
    {x: 338, y: 526},
    {x: 456, y: 444},
    {x: 590, y: 510},
  ]
  const bezierPoints: BezierPoint[] = [
    {anchor: {x: 120, y: 516}, cp2: {x: 156, y: 470}},
    {anchor: {x: 224, y: 454}, cp1: {x: 188, y: 452}, cp2: {x: 260, y: 454}},
    {anchor: {x: 338, y: 526}, cp1: {x: 304, y: 546}, cp2: {x: 380, y: 534}},
    {anchor: {x: 456, y: 444}, cp1: {x: 424, y: 412}, cp2: {x: 500, y: 440}},
    {anchor: {x: 590, y: 510}, cp1: {x: 546, y: 536}},
  ]

  const bounds = getBoundingRectFromBezierPoints(bezierPoints)
  return {points, bezierPoints, bounds}
}

export const ribbonPath = createBezierRibbonPath()
