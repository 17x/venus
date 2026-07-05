import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {describe, it} from 'node:test'

const themeProviderSource = readFileSync(new URL('./themeProvider.tsx', import.meta.url), 'utf8')

describe('vector theme provider contract', () => {
  it('keeps resolved dark mode synchronized with the document root', () => {
    assert.match(themeProviderSource, /document\.documentElement/)
    assert.match(themeProviderSource, /classList\.toggle\('dark', resolvedMode === 'dark'\)/)
    assert.match(themeProviderSource, /style\.colorScheme = resolvedMode/)
  })
})
