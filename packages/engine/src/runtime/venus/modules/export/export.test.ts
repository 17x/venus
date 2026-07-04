import { describe, it } from 'node:test'
import * as assert from 'node:assert'

import { Venus } from '../../Venus.ts'
import type { VenusExportApi } from './api.ts'
import { createVenusInteractionModule } from '../interaction/module.ts'
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
      () => venus.exportSVG(),
      /module "export" is not installed/,
    )
    await assert.rejects(
      () => venus.exportNode('card'),
      /module "export" is not installed/,
    )
  })

  it('keeps backward-compatible export aliases gated by the export module', async () => {
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
      fontFamily: 'Geist',
      fontSize: 18,
      fontStyle: 'italic',
      letterSpacing: 0.75,
    })
    venus.add({
      type: 'group',
      id: 'grouped',
      children: [
        { type: 'ellipse', id: 'dot', ellipseGeometry: { cx: 180, cy: 80, rx: 24, ry: 18 }, fill: '#3b82f6' },
      ],
    })
    venus.add({
      type: 'image',
      id: 'photo',
      x: 220,
      y: 24,
      width: 64,
      height: 48,
      assetId: 'asset-photo',
      assetUrl: 'https://cdn.example.test/photo.png',
    })
    venus.add({
      type: 'clip',
      id: 'path-clip',
      clipPath: {
        type: 'polygon',
        x: 300,
        y: 20,
        width: 80,
        height: 70,
        points: [
          {x: 300, y: 20},
          {x: 380, y: 20},
          {x: 340, y: 90},
        ],
      },
      children: [
        {type: 'rect', id: 'clipped-card', x: 300, y: 20, width: 80, height: 70, fill: '#f97316'},
      ],
    })

    const svg = await venus.exportSVG()

    assert.match(svg, /^<svg /)
    assert.match(svg, /viewBox="0 0 \d+ \d+"/)
    assert.match(svg, /<rect[^>]+id="card"[^>]+fill="#22c55e"[^>]+stroke="#14532d"/)
    assert.match(svg, /<text[^>]+id="label"[^>]*>.*Exported.*<\/text>/s)
    assert.match(svg, /<text[^>]+font-family="Geist"/)
    assert.match(svg, /<text[^>]+font-style="italic"/)
    assert.match(svg, /<text[^>]+letter-spacing="0.75"/)
    assert.match(svg, /<g[^>]+id="grouped"/)
    assert.match(svg, /<image[^>]+id="photo"[^>]+href="https:\/\/cdn\.example\.test\/photo\.png"/)
    assert.match(svg, /<image[^>]+data-asset-id="asset-photo"[^>]+data-asset-url="https:\/\/cdn\.example\.test\/photo\.png"/)
    assert.match(svg, /<g[^>]+id="path-clip"[^>]+clip-path="url\(#venus-clip-\d+\)"/)
    assert.match(svg, /<clipPath[^>]*><path[^>]+d="M 300 20 L 380 20 L 340 90 Z"/)
    assert.match(svg, /<ellipse[^>]+id="dot"[^>]+cx="180"[^>]+rx="24"/)
    assert.doesNotMatch(svg, /full SVG export not yet implemented/)
  })

  it('keeps legacy toSVG as an alias for exportSVG', async () => {
    const venus = new Venus({ modules: [createVenusExportModule()] })
    venus.add({ type: 'rect', id: 'card', width: 120, height: 80, fill: '#22c55e' })

    const direct = await venus.exportSVG()
    const alias = await venus.toSVG()

    assert.equal(alias, direct)
  })

  it('exports a single node as a cropped SVG', async () => {
    const venus = new Venus({ modules: [createVenusExportModule()] })
    venus.add({ type: 'rect', id: 'card', x: 12, y: 16, width: 120, height: 80, fill: '#22c55e' })
    venus.add({ type: 'text', id: 'label', x: 200, y: 32, text: 'Other' })

    const svg = await venus.exportNode('card')

    assert.match(svg, /viewBox="12 16 120 80"/)
    assert.match(svg, /id="card"/)
    assert.doesNotMatch(svg, /id="label"/)

    await assert.rejects(
      () => venus.exportNode('missing'),
      /node not found/,
    )
  })

  it('exports the current selection while preserving ancestor group wrappers', async () => {
    const venus = new Venus({ modules: [createVenusInteractionModule(), createVenusExportModule()] })
    venus.add({
      type: 'group',
      id: 'grouped',
      children: [
        { type: 'rect', id: 'selected', x: 20, y: 30, width: 40, height: 50, fill: '#3b82f6' },
        { type: 'rect', id: 'sibling', x: 120, y: 30, width: 40, height: 50, fill: '#ef4444' },
      ],
    })
    venus.setSelection(['selected'])

    const svg = await venus.exportSelection()

    assert.match(svg, /viewBox="20 30 40 50"/)
    assert.match(svg, /<g[^>]+id="grouped"/)
    assert.match(svg, /id="selected"/)
    assert.doesNotMatch(svg, /id="sibling"/)
  })

  it('rejects selection export when no nodes are selected', async () => {
    const venus = new Venus({ modules: [createVenusInteractionModule(), createVenusExportModule()] })

    await assert.rejects(
      () => venus.exportSelection(),
      /selection is empty/,
    )
  })
})
