import { describe, it } from 'node:test'
import * as assert from 'node:assert'

import { Venus } from '../../Venus.ts'
import type { VenusExportApi } from './api.ts'
import { createVenusExportModule } from './module.ts'

/** Creates the export API with a small fake Venus runtime. */
function createApiForCanvas(canvas: unknown): VenusExportApi {
  const module = createVenusExportModule()
  return module.install({
    venus: {
      _getMountedCanvas: () => canvas,
      snapshot: () => ({ revision: 1, width: 320, height: 180, nodes: [] }),
    },
    services: {} as never,
  } as never) as VenusExportApi
}

describe('export module', () => {
  it('keeps export APIs unavailable until the export module is installed', async () => {
    const venus = new Venus()

    await assert.rejects(
      () => venus.toSVG(),
      /module "export" is not installed/,
    )
  })

  it('exports PNG through a scaled background canvas when requested', async () => {
    const operations: string[] = []
    const exportCanvas = {
      width: 0,
      height: 0,
      getContext: () => ({
        set fillStyle(value: string) { operations.push(`fillStyle:${value}`) },
        fillRect: (x: number, y: number, width: number, height: number) => operations.push(`fillRect:${x},${y},${width},${height}`),
        drawImage: (_canvas: unknown, x: number, y: number, width: number, height: number) => operations.push(`drawImage:${x},${y},${width},${height}`),
      }),
      toDataURL: (mime: string) => `data:${mime};scaled`,
    }
    const sourceCanvas = {
      width: 100,
      height: 50,
      ownerDocument: {
        createElement: () => exportCanvas,
      },
      toDataURL: () => 'data:image/png;source',
    }

    const api = createApiForCanvas(sourceCanvas)
    const url = await api.toPNG({ scale: 2, background: '#ffffff' })

    assert.equal(url, 'data:image/png;scaled')
    assert.equal(exportCanvas.width, 200)
    assert.equal(exportCanvas.height, 100)
    assert.deepEqual(operations, [
      'fillStyle:#ffffff',
      'fillRect:0,0,200,100',
      'drawImage:0,0,200,100',
    ])
  })

  it('exports JPEG with default white background and clamped quality', async () => {
    const qualityValues: unknown[] = []
    const exportCanvas = {
      width: 0,
      height: 0,
      getContext: () => ({
        set fillStyle(_value: string) {},
        fillRect: () => {},
        drawImage: () => {},
      }),
      toDataURL: (_mime: string, quality?: unknown) => {
        qualityValues.push(quality)
        return 'data:image/jpeg;export'
      },
    }
    const sourceCanvas = {
      width: 100,
      height: 50,
      ownerDocument: {
        createElement: () => exportCanvas,
      },
    }

    const api = createApiForCanvas(sourceCanvas)
    const url = await api.toJPEG({ quality: 2 })

    assert.equal(url, 'data:image/jpeg;export')
    assert.deepEqual(qualityValues, [1])
  })

  it('serializes the current scene snapshot into SVG elements', async () => {
    const venus = new Venus({ modules: [createVenusExportModule()] })
    venus.add({
      type: 'rect',
      id: 'card',
      x: 12,
      y: 16,
      width: 120,
      height: 80,
      fill: '#22c55e',
      stroke: '#14532d',
      strokeWidth: 2,
      cornerRadius: 8,
    })
    venus.add({
      type: 'text',
      id: 'label',
      x: 20,
      y: 32,
      text: 'Exported',
      fill: '#111827',
      fontSize: 18,
    })
    venus.add({
      type: 'group',
      id: 'grouped',
      children: [
        { type: 'ellipse', id: 'dot', ellipseGeometry: { cx: 180, cy: 80, rx: 24, ry: 18 }, fill: '#3b82f6' },
      ],
    })

    const svg = await venus.toSVG()

    assert.match(svg, /^<svg /)
    assert.match(svg, /viewBox="0 0 \d+ \d+"/)
    assert.match(svg, /<rect[^>]+id="card"[^>]+fill="#22c55e"[^>]+stroke="#14532d"/)
    assert.match(svg, /<text[^>]+id="label"[^>]*>.*Exported.*<\/text>/s)
    assert.match(svg, /<g[^>]+id="grouped"/)
    assert.match(svg, /<ellipse[^>]+id="dot"[^>]+cx="180"[^>]+rx="24"/)
    assert.doesNotMatch(svg, /full SVG export not yet implemented/)
  })
})
