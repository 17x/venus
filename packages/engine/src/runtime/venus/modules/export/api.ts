/**
 * Export module API -- the typed surface returned by the export module's
 * install callback. Provides document export to raster images and SVG markup.
 */

/** Common raster export options shared by PNG and JPEG export. */
export interface VenusRasterExportOptions {
  /** Output scale factor applied to the mounted canvas pixel buffer. Defaults to 1. */
  scale?: number
  /** Optional background color composited behind the canvas before export. */
  background?: string
}

/** PNG export options. */
export interface VenusPngExportOptions extends VenusRasterExportOptions {}

/** JPEG export options. */
export interface VenusJpegExportOptions extends VenusRasterExportOptions {
  /** JPEG quality in the [0, 1] range. Defaults to 0.92. */
  quality?: number
}

/** SVG export options. */
export interface VenusSvgExportOptions {
  /** When true, image nodes use their asset id as href even for non-URL ids. */
  embedImages?: boolean
  /** When true, emits line breaks between top-level SVG nodes. Defaults to true. */
  pretty?: boolean
}

export interface VenusExportApi {
  /**
   * Exports the current document as a PNG data URL.
   * @param options.scale Output scale factor (default 1).
   * @param options.background Background color (default transparent).
   */
  toPNG(options?: VenusPngExportOptions): Promise<string>

  /**
   * Exports the current document as a JPEG data URL.
   * @param options.scale Output scale factor (default 1).
   * @param options.quality JPEG quality 0-1 (default 0.92).
   * @param options.background Background color (default white).
   */
  toJPEG(options?: VenusJpegExportOptions): Promise<string>

  /**
   * Exports the current document as an SVG string.
   * @param options.embedImages Writes image asset ids to href even when they are not URLs.
   * @param options.pretty Whether to emit line breaks between top-level SVG nodes.
   */
  toSVG(options?: VenusSvgExportOptions): Promise<string>
}
