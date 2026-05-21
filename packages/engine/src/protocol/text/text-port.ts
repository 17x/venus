/**
 * Text shaping input used across runtime and adapter boundaries.
 */
export interface EngineTextShapeInput {
  /** Source text content to shape. */
  text: string;
  /** Font family identifier used for shaping. */
  fontFamily: string;
  /** Font size in CSS pixels. */
  fontSizePx: number;
}

/**
 * Text shaping output consumed by render planning and extraction lanes.
 */
export interface EngineTextShapeOutput {
  /** Total shaped width in CSS pixels. */
  widthPx: number;
  /** Total shaped height in CSS pixels. */
  heightPx: number;
  /** Number of shaped glyphs for diagnostics and planning. */
  glyphCount: number;
}

/**
 * Text boundary contract for shaping and metrics adapters.
 */
export interface EngineTextPort {
  /** Shapes one text payload and returns deterministic metrics output. */
  shapeText: (input: EngineTextShapeInput) => EngineTextShapeOutput;
}
