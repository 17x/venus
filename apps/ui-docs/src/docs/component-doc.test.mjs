import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {describe, it} from 'node:test'

const source = readFileSync(new URL('./component-doc.tsx', import.meta.url), 'utf8')

describe('component documentation disclosure', () => {
  it('keeps examples collapsed until the labelled disclosure is activated', () => {
    assert.match(source, /function ExampleSection/)
    assert.match(source, /const \[open, setOpen\] = useState\(false\)/)
    assert.match(source, /aria-expanded=\{open\}/)
    assert.match(source, /\{open \? <CardContent/)
    assert.doesNotMatch(source, /Copyable public API usage/)
  })

  it('clamps only overflowing API references and exposes both disclosure states', () => {
    assert.match(source, /const apiCollapsedHeight = 288/)
    assert.match(source, /content\.scrollHeight > apiCollapsedHeight \+ 1/)
    assert.match(source, /new ResizeObserver\(updateOverflow\)/)
    assert.match(source, /overflowing && !expanded && 'max-h-72'/)
    assert.match(source, /bg-gradient-to-t from-card via-card\/95 to-transparent/)
    assert.match(source, /Show more/)
    assert.match(source, /Show less/)
  })

  it('keeps demo chrome compact and omits repeated package badges and instructions', () => {
    assert.match(source, /<Card density=\{'compact'\}>/)
    assert.match(source, /<CardHeader className=\{'p-3 pb-2'\}>/)
    assert.doesNotMatch(source, /Use pointer and keyboard interactions directly in this preview/)
    assert.doesNotMatch(source, /<Badge/)
  })
})
