/**
 * Export module implementation.
 *
 * Provides document export to PNG, JPEG, and SVG formats.  PNG/JPEG export
 * reads the current canvas pixel buffer; SVG export produces a minimal
 * serialisation of the document model.
 */
import type { VenusExportApi } from './api.ts'
import type { VenusModule, VenusModuleContext } from '../../Venus.ts'

/** Minimal shape of a Venus instance needed by the export module. */
interface ExportVenus {
  snapshot(): { nodes: readonly unknown[]; width: number; height: number }
  _getMountedCanvas(): HTMLCanvasElement | null
}

/**
 * Creates the export module definition.
 */
export function createVenusExportModule(): VenusModule {
  return {
    name: 'export' as const,

    install(context: VenusModuleContext): VenusExportApi {
      const venus = context.venus as ExportVenus
      const requireCanvas = () => {
        const canvas = venus._getMountedCanvas()
        if (!canvas) {
          throw new Error('Cannot export: Venus is not mounted to a canvas')
        }
        return canvas
      }

      return {
        async toPNG(options = {}) {
          void options
          const canvas = requireCanvas()
          return canvas.toDataURL('image/png')
        },

        async toJPEG(options = {}) {
          const canvas = requireCanvas()
          const { quality = 0.92, background = '#ffffff' } = options
          // JPEG does not support transparency; fill background first.
          const offscreen = document.createElement('canvas')
          offscreen.width = canvas.width
          offscreen.height = canvas.height
          const ctx2d = offscreen.getContext('2d')
          if (!ctx2d) {
            throw new Error('Cannot create offscreen canvas for JPEG export')
          }
          ctx2d.fillStyle = background
          ctx2d.fillRect(0, 0, offscreen.width, offscreen.height)
          ctx2d.drawImage(canvas, 0, 0)
          return offscreen.toDataURL('image/jpeg', quality)
        },

        async toSVG(_options = {}) {
          const snap = venus.snapshot()
          // AI-TEMP: minimal SVG serialisation; remove when full SVG export is implemented; ref ENGINE_MODULE_CONSTRAINTS.md
          const nodeCount = snap.nodes.length
          return `<svg xmlns="http://www.w3.org/2000/svg" width="${snap.width}" height="${snap.height}">`
            + `\n  <!-- ${nodeCount} node(s) — full SVG export not yet implemented -->`
            + `\n</svg>`
        },
      }
    },
  }
}
