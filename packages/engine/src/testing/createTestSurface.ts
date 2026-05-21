import type { EngineSurface } from "../api/public-types";

/**
 * Creates a deterministic test surface used by engine runtime tests.
 * @param width Surface width in CSS pixels.
 * @param height Surface height in CSS pixels.
 */
export function createTestSurface(width: number, height: number): EngineSurface {
  return { width, height };
}
