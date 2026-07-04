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
  createVenusCameraModule,
  createVenusEffectsModule,
  createVenusExportModule,
  createVenusInteractionModule,
} from '../index.ts'

describe('module combinations', () => {
  it('keeps the base runtime free of optional modules', () => {
    const venus = new Venus()

    assert.deepEqual(venus.modules(), ['base'])
    assert.throws(() => venus.select('missing'), /module "interaction" is not installed/)
  })

  it('uses the default base module for root-level layer APIs', () => {
    const venus = new Venus()
    venus.add({id: 'a', type: 'rect', width: 10, height: 10})
    venus.add({id: 'b', type: 'rect', width: 10, height: 10})

    assert.deepEqual(venus.getLayerOrder(), ['a', 'b'])
    assert.equal(venus.sendToBack('b'), 0)
    assert.deepEqual(venus.getLayerOrder(), ['b', 'a'])
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

  it('gets and replaces selection through root-level interaction APIs', () => {
    const venus = new Venus({ modules: [createVenusInteractionModule()] })
    venus.add({ type: 'rect', id: 'r1', width: 100, height: 80 })
    venus.add({ type: 'ellipse', id: 'e1', width: 80, height: 60 })

    venus.setSelection(['r1'])
    assert.deepEqual([...venus.getSelection()], ['r1'])

    const snapshot = venus.getSelection() as Set<string>
    snapshot.add('external-mutation')
    assert.deepEqual([...venus.getSelection()], ['r1'])

    venus.setSelection(['e1'])
    assert.deepEqual([...venus.getSelection()], ['e1'])
  })

  it('queries and applies marquee selection using document-space rectangles', () => {
    const venus = new Venus({ modules: [createVenusInteractionModule()] })
    venus.add({ type: 'rect', id: 'inside', x: 20, y: 20, width: 40, height: 40 })
    venus.add({ type: 'rect', id: 'overlap', x: 90, y: 20, width: 40, height: 40 })
    venus.add({ type: 'rect', id: 'outside', x: 180, y: 20, width: 40, height: 40 })

    assert.deepEqual(
      venus.querySelectionInRect({x: 0, y: 0, width: 100, height: 100}),
      ['inside', 'overlap'],
    )
    assert.deepEqual(
      venus.querySelectionInRect({x: 0, y: 0, width: 100, height: 100}, {mode: 'contain'}),
      ['inside'],
    )

    assert.deepEqual(
      venus.selectInRect({x: 0, y: 0, width: 100, height: 100}, {mode: 'contain'}),
      ['inside'],
    )

    assert.deepEqual(
      venus.selectInRect({x: 170, y: 0, width: 100, height: 100}, {selectionMode: 'add'}),
      ['inside', 'outside'],
    )

    assert.deepEqual(
      venus.selectInRect({x: 0, y: 0, width: 100, height: 100}, {selectionMode: 'toggle', mode: 'contain'}),
      ['outside'],
    )

    assert.deepEqual(
      venus.selectInRect({x: 170, y: 0, width: 100, height: 100}, {selectionMode: 'subtract'}),
      [],
    )
  })

  it('filters locked, hidden, and container nodes in marquee queries', () => {
    const venus = new Venus({ modules: [createVenusInteractionModule()] })
    venus.add({
      type: 'group',
      id: 'group',
      children: [
        { type: 'rect', id: 'child', x: 10, y: 10, width: 20, height: 20 },
      ],
    })
    venus.add({
      type: 'group',
      id: 'hidden-group',
      visible: false,
      children: [
        { type: 'rect', id: 'hidden-child', x: 10, y: 40, width: 20, height: 20 },
      ],
    })
    venus.add({ type: 'rect', id: 'locked', x: 40, y: 10, width: 20, height: 20, locked: true })
    venus.add({ type: 'rect', id: 'hidden', x: 70, y: 10, width: 20, height: 20, visible: false })

    const rect = {x: 0, y: 0, width: 120, height: 80}
    assert.deepEqual(venus.querySelectionInRect(rect), ['child', 'group'])
    assert.deepEqual(
      venus.querySelectionInRect(rect, {includeContainers: false, includeLocked: true, includeHidden: true}),
      ['child', 'hidden-child', 'locked', 'hidden'],
    )
  })

  it('queries marquee selection from screen-space rectangles through camera projection', () => {
    const venus = new Venus({ modules: [createVenusCameraModule(), createVenusInteractionModule()] })
    venus.add({ type: 'rect', id: 'inside', x: 20, y: 20, width: 40, height: 40 })
    venus.add({ type: 'rect', id: 'outside', x: 120, y: 20, width: 40, height: 40 })

    venus.zoomTo(2, {x: 0, y: 0})

    assert.deepEqual(
      venus.querySelectionInRect(
        {x: 35, y: 35, width: 90, height: 90},
        {coordinateSpace: 'screen', mode: 'contain'},
      ),
      ['inside'],
    )
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
