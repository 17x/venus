/**
 * Declares procedural texture families used by playground 3D demos.
 */
export type ProceduralTexturePreset =
  | 'ground-grass'
  | 'road-asphalt'
  | 'editor-floor'
  | 'panel-metal'

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value))

const hashNoise = (x: number, y: number, seed: number): number => {
  const v = Math.sin((x * 127.1 + y * 311.7 + seed * 74.7) * 0.0174533) * 43758.5453
  return v - Math.floor(v)
}

const mix = (a: number, b: number, t: number): number => a + (b - a) * clamp01(t)

const rgb = (r: number, g: number, b: number): string =>
  `rgb(${Math.round(clamp01(r) * 255)}, ${Math.round(clamp01(g) * 255)}, ${Math.round(clamp01(b) * 255)})`

const sampleGroundGrass = (u: number, v: number): string => {
  const n0 = hashNoise(u * 12, v * 12, 1)
  const n1 = hashNoise(u * 33, v * 27, 2)
  const blade = 0.35 + n0 * 0.45 + n1 * 0.2
  return rgb(mix(0.18, 0.28, blade), mix(0.34, 0.52, blade), mix(0.16, 0.3, blade))
}

const sampleRoadAsphalt = (u: number, v: number): string => {
  const n0 = hashNoise(u * 20, v * 20, 3)
  const n1 = hashNoise(u * 61, v * 57, 4)
  const grit = 0.25 + n0 * 0.55 + n1 * 0.2
  return rgb(mix(0.2, 0.34, grit), mix(0.22, 0.36, grit), mix(0.24, 0.4, grit))
}

const sampleEditorFloor = (u: number, v: number): string => {
  const cellX = Math.floor(u * 10)
  const cellY = Math.floor(v * 10)
  const n = hashNoise(u * 16, v * 16, 5)
  const even = (cellX + cellY) % 2 === 0
  const base = even ? 0.18 : 0.12
  const accent = even ? 0.07 : 0.05
  return rgb(base + n * accent, base + n * accent + 0.03, base + n * accent + 0.08)
}

const samplePanelMetal = (u: number, v: number): string => {
  const stripe = Math.sin((u * 24 + v * 7) * Math.PI * 2) * 0.5 + 0.5
  const n = hashNoise(u * 42, v * 42, 6)
  const t = clamp01(stripe * 0.7 + n * 0.3)
  return rgb(mix(0.28, 0.55, t), mix(0.32, 0.62, t), mix(0.38, 0.72, t))
}

/**
 * Samples one deterministic procedural color from atlas preset at UV location.
 */
export const sampleProceduralTextureColor = (
  preset: ProceduralTexturePreset,
  u: number,
  v: number,
): string => {
  const uu = u - Math.floor(u)
  const vv = v - Math.floor(v)
  if (preset === 'ground-grass') return sampleGroundGrass(uu, vv)
  if (preset === 'road-asphalt') return sampleRoadAsphalt(uu, vv)
  if (preset === 'editor-floor') return sampleEditorFloor(uu, vv)
  return samplePanelMetal(uu, vv)
}
