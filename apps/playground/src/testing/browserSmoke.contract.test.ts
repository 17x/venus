import {chromium} from 'playwright'
import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import fs from 'node:fs'

const distDir = path.resolve(process.cwd(), 'dist')
const screenshotDir = path.resolve(process.cwd(), 'public')

/**
 * Launches headless Chromium, loads the built playground via file://, and verifies page structure.
 */
test('playground built page renders root div and title under headless chromium', async () => {
  const browser = await chromium.launch({headless: true})
  const page = await browser.newPage()

  try {
    await page.goto(`file://${distDir}/index.html`, {waitUntil: 'domcontentloaded', timeout: 10000})

    const title = await page.title()
    assert.equal(title.includes('Playground'), true)

    const rootVisible = await page.$('#root')
    assert.ok(rootVisible, 'root element missing in rendered page')

    fs.mkdirSync(screenshotDir, {recursive: true})
    await page.screenshot({path: path.join(screenshotDir, 'release-smoke.png')})
    assert.equal(fs.existsSync(path.join(screenshotDir, 'release-smoke.png')), true)
  } finally {
    await browser.close()
  }
})
