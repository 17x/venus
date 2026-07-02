/**
 * Export module API — the typed surface returned by the export module's
 * install callback.  Provides document export to image, SVG, and PDF formats.
 */
export interface VenusExportApi {
  /**
   * Exports the current document as a PNG data URL.
   * @param options.scale Output scale factor (default 1).
   * @param options.background Background color (default transparent).
   */
  toPNG(options?: { scale?: number; background?: string }): Promise<string>

  /**
   * Exports the current document as a JPEG data URL.
   * @param options.scale Output scale factor (default 1).
   * @param options.quality JPEG quality 0–1 (default 0.92).
   * @param options.background Background color (default white).
   */
  toJPEG(options?: { scale?: number; quality?: number; background?: string }): Promise<string>

  /**
   * Exports the current document as an SVG string.
   * @param options.embedImages Whether to embed images as data URIs (default false).
   */
  toSVG(options?: { embedImages?: boolean }): Promise<string>
}
