/**
 * Module combination integration tests.
 *
 * Verifies that multiple Venus modules install correctly and their APIs
 * interoperate as expected.  Covers interaction (selection), effects
 * (shadow/blur), and export (PNG/SVG) in a single Venus instance.
 */
import { describe, it } from 'node:test'
import * as assert from 'node:assert'

import { Venus } from '../../Venus.ts'
import {
  createVenusEffectsModule,
  createVenusExportModule,
  createVenusInteractionModule,
} from '../index.ts'

describe('module combinations', () => {
  it('keeps the base runtime free of optional modules', () => {
    const venus = new Venus()

    assert.deepEqual(venus.modules(), [])
    assert.throws(() => venus.select('missing'), /module "interaction" is not installed/)
  })

  it('select and deselect nodes via interaction module', () => {
    const venus = new Venus({ modules: [createVenusInteractionModule()] })
    venus.add({ type: 'rect', id: 'r1', width: 100, height: 80 })
    venus.add({ type: 'ellipse', id: 'e1', width: 80, height: 60 })

    // Initially nothing selected.
    assert.equal(venus.isSelected('r1'), false)
    assert.equal(venus.isSelected('e1'), false)

    // Select one.
    venus.select('r1')
    assert.equal(venus.isSelected('r1'), true)
    assert.equal(venus.isSelected('e1'), false)

    // Select another — additive.
    venus.select('e1')
    assert.equal(venus.isSelected('r1'), true)
    assert.equal(venus.isSelected('e1'), true)

    // Deselect.
    venus.deselect('r1')
    assert.equal(venus.isSelected('r1'), false)
    assert.equal(venus.isSelected('e1'), true)

    // Select all.
    venus.clearSelection()
    venus.selectAll()
    assert.equal(venus.isSelected('r1'), true)
    assert.equal(venus.isSelected('e1'), true)

    // Clear.
    venus.clearSelection()
    assert.equal(venus.isSelected('r1'), false)
    assert.equal(venus.isSelected('e1'), false)
  })

  it('fires onSelectionChange when selection changes', () => {
    const venus = new Venus({ modules: [createVenusInteractionModule()] })
    venus.add({ type: 'rect', id: 'r1', width: 100, height: 80 })

    const events: string[][] = []
    const off = venus.onSelectionChange((sel) => {
      events.push([...sel].sort())
    })

    venus.select('r1')
    assert.deepStrictEqual(events, [['r1']])

    venus.clearSelection()
    assert.deepStrictEqual(events, [['r1'], []])

    off()
    venus.select('r1')
    // Listener was unsubscribed — no new event.
    assert.equal(events.length, 2)
  })

  it('applyDropShadow and clearEffects via effects module', () => {
    const venus = new Venus({ modules: [createVenusEffectsModule()] })
    venus.add({ type: 'rect', id: 'r1', width: 100, height: 80 })

    // Apply shadow — should not throw.
    venus.applyDropShadow('r1', { color: '#00000040', offsetX: 4, offsetY: 4, blur: 8 })

    // Apply inner shadow.
    venus.applyInnerShadow('r1', { color: '#00000030', blur: 4 })

    // Apply layer blur.
    venus.applyLayerBlur('r1', { amount: 4 })

    // Clear all — should not throw.
    venus.clearEffects('r1')
  })

  it('toPNG throws before mount, works after mount (browser-only)', async () => {
    const venus = new Venus({ modules: [createVenusExportModule()] })
    venus.add({ type: 'rect', id: 'r1', width: 100, height: 80 })

    // Export before mount should throw because no canvas is mounted yet.
    await assert.rejects(
      () => venus.toPNG(),
      /not mounted/,
    )
  })

  it('modules() returns all installed module names', () => {
    const venus = new Venus({ modules: [createVenusInteractionModule(), createVenusEffectsModule()] })
    const names = venus.modules()

    assert.ok(names.includes('interaction'))
    assert.ok(names.includes('effects'))
    assert.equal(names.includes('export'), false)
  })

  it('rejects duplicate module names during construction', () => {
    const duplicate = {
      name: 'interaction' as const,
      install() { return {} },
    }
    assert.throws(() => {
      new Venus({ modules: [createVenusInteractionModule(), duplicate] })
    }, /already installed/)
  })
})
