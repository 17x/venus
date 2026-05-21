import assert from 'node:assert/strict'
import test from 'node:test'
import type {DocumentNode} from '../../../runtime/model/index.ts'
import {resolveElementModifyCommands} from '../selectionAndCommands.ts'

/**
 * Creates one text shape fixture for text-run patch policy tests.
 */
function createTextShapeFixture(): DocumentNode {
  return {
    id: 'text-1',
    type: 'text',
    name: 'Text 1',
    text: 'hello world',
    textRuns: [
      {
        start: 0,
        end: 11,
        style: {
          fontFamily: 'Arial',
          fontSize: 16,
          lineHeight: 1.4,
          letterSpacing: 0,
        },
      },
    ],
    x: 0,
    y: 0,
    width: 120,
    height: 32,
  }
}

test('element modify resolves textRuns patch when incoming props include textRuns', () => {
  const shape = createTextShapeFixture()

  const commands = resolveElementModifyCommands({
    shape,
    props: {
      textRuns: [
        {
          start: 0,
          end: 11,
          style: {
            fontFamily: 'Helvetica',
            fontSize: 18,
            lineHeight: 1.6,
            letterSpacing: 0.5,
            textAlign: 'center',
            verticalAlign: 'middle',
            paragraphIndentLeft: 8,
            paragraphIndentFirst: 4,
            paragraphIndentRight: 6,
            paragraphSpaceBeforeLine: 3,
            paragraphSpaceAfterLine: 5,
          },
        },
      ],
    },
  })

  const patchCommand = commands.find((command) => command.type === 'shape.patch')
  assert.ok(patchCommand)
  assert.equal(patchCommand.type, 'shape.patch')
  assert.ok(Array.isArray(patchCommand.patch.textRuns))
  assert.equal(patchCommand.patch.textRuns?.[0]?.style?.fontFamily, 'Helvetica')
  assert.equal(patchCommand.patch.textRuns?.[0]?.style?.paragraphIndentLeft, 8)
  assert.equal(patchCommand.patch.textRuns?.[0]?.style?.paragraphSpaceAfterLine, 5)
})
