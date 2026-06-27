import assert from 'node:assert/strict'
import {describe, it} from 'node:test'
import {Venus} from './Venus.ts'

describe('Venus events', () => {
  it('subscribes, emits, and unsubscribes document events', () => {
    const venus = new Venus()
    const revisions: number[] = []

    const unsubscribe = venus.on('document:changed', (event) => {
      revisions.push(event.revision)
    })

    venus.add({
      type: 'rect',
      width: 100,
      height: 80,
    })

    unsubscribe()

    venus.add({
      type: 'ellipse',
      width: 80,
      height: 80,
    })

    assert.deepEqual(revisions, [2])
  })

  it('supports off with the original handler', () => {
    const venus = new Venus()
    let count = 0
    const handler = () => {
      count += 1
    }

    venus.on('document:changed', handler)
    venus.off('document:changed', handler)
    venus.add({
      type: 'rect',
      width: 100,
      height: 80,
    })

    assert.equal(count, 0)
  })
})

describe('Venus transforms', () => {
  it('maps document transform properties to engine matrices', () => {
    const venus = new Venus()

    venus.add({
      type: 'rect',
      x: 10,
      y: 20,
      width: 100,
      height: 80,
      rotation: 30,
      flipX: true,
      skewY: 10,
    })

    const [node] = venus.document.snapshot().nodes

    assert.equal(node.type, 'shape')
    assert.ok(node.transform)
    assert.notDeepEqual(node.transform.matrix, [1, 0, 0, 0, 1, 0])
  })

  it('maps transform object with origin and scale to engine matrices', () => {
    const venus = new Venus()

    venus.add({
      type: 'rect',
      id: 'rect-with-origin',
      x: 10,
      y: 20,
      width: 100,
      height: 80,
      transform: {
        rotation: 45,
        scaleX: 1.5,
        scaleY: 0.75,
        origin: {x: 0, y: 0},
      },
    })

    const [node] = venus.document.snapshot().nodes

    assert.equal(node.type, 'shape')
    assert.ok(node.transform)
    assert.notDeepEqual(node.transform.matrix, [1, 0, 0, 0, 1, 0])
  })

  it('keeps group x and y as a transform matrix', () => {
    const venus = new Venus()

    venus.add({
      type: 'group',
      x: 12,
      y: 18,
      children: [{type: 'rect', width: 40, height: 30}],
    })

    const [node] = venus.document.snapshot().nodes

    assert.equal(node.type, 'group')
    assert.deepEqual(node.transform?.matrix, [1, 0, 12, 0, 1, 18])
  })

  it('keeps group children as document tree objects while indexing by id', () => {
    const venus = new Venus()

    venus.add({
      type: 'group',
      id: 'group-a',
      name: 'Group A',
      transform: {x: 12, y: 18},
      children: [
        {type: 'rect', id: 'rect-a', width: 40, height: 30},
        {type: 'text', id: 'text-a', text: 'Label'},
      ],
    })

    assert.equal(venus.document.getNodeById('rect-a')?.type, 'rect')
    assert.equal(venus.document.getParentId('rect-a'), 'group-a')
    assert.equal(venus.document.children()[0]?.type, 'group')
  })
})
