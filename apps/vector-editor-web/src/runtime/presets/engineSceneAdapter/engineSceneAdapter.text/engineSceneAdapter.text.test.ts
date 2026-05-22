import assert from 'node:assert/strict'
import test from 'node:test'
import {readRunParagraphStyle, resolveEngineTextAlign} from './engineSceneAdapter.text.ts'

test('engine text helper resolves paragraph style payload from text run style', () => {
  const paragraphStyle = readRunParagraphStyle({
    paragraphIndentLeft: 12,
    paragraphIndentFirst: 6,
    paragraphIndentRight: 10,
    paragraphSpaceBeforeLine: 8,
    paragraphSpaceAfterLine: 9,
  })

  assert.ok(paragraphStyle)
  assert.equal(paragraphStyle.paragraphIndentLeft, 12)
  assert.equal(paragraphStyle.paragraphIndentFirst, 6)
  assert.equal(paragraphStyle.paragraphIndentRight, 10)
  assert.equal(paragraphStyle.paragraphSpaceBeforeLine, 8)
  assert.equal(paragraphStyle.paragraphSpaceAfterLine, 9)
})

test('engine text helper returns undefined when paragraph style payload is empty', () => {
  const paragraphStyle = readRunParagraphStyle({
    fontFamily: 'Arial',
    fontSize: 16,
  })

  assert.equal(paragraphStyle, undefined)
})

test('engine text align mapper keeps left/center/right compatibility', () => {
  assert.equal(resolveEngineTextAlign('left'), 'start')
  assert.equal(resolveEngineTextAlign('center'), 'center')
  assert.equal(resolveEngineTextAlign('right'), 'end')
})
