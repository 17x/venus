#!/usr/bin/env node

import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import process from 'node:process'
import {chromium} from 'playwright'

const HOST = '127.0.0.1'
const PORT = 4178
const URL = `http://${HOST}:${PORT}`

async function waitForServer(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // Vite is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error(`Timed out waiting for ${url}`)
}

async function runSmoke() {
  const server = spawn('pnpm', ['vite', '--host', HOST, '--port', String(PORT)], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let serverOutput = ''
  server.stdout.on('data', (chunk) => {
    serverOutput += String(chunk)
  })
  server.stderr.on('data', (chunk) => {
    serverOutput += String(chunk)
  })

  try {
    await waitForServer(URL)
    const browser = await chromium.launch({headless: true})
    try {
      const page = await browser.newPage({viewport: {width: 1440, height: 900}})
      const browserErrors = []
      page.on('pageerror', (error) => browserErrors.push(error.message))
      await page.goto(URL, {waitUntil: 'domcontentloaded'})

      const treeItems = page.getByRole('treeitem')
      await treeItems.first().waitFor()
      const initialLayerCount = await treeItems.count()
      assert.ok(initialLayerCount > 2, 'mock file should expose multiple layer rows')

      const firstLayer = treeItems.first()
      await firstLayer.click()
      await firstLayer.focus()
      await page.keyboard.press('Enter')
      assert.equal(await firstLayer.getAttribute('aria-selected'), 'true')

      const focusRoot = page.getByTestId('editor.focus-root')
      const stage = page.getByTestId('editor.stage')
      const stageBox = await stage.boundingBox()
      assert.ok(stageBox, 'editor stage should expose pointer bounds')
      await page.mouse.move(stageBox.x + stageBox.width / 2, stageBox.y + stageBox.height / 2)
      await page.evaluate(() => {
        delete window.__venusZeroVisibilityDebug
      })
      await page.keyboard.down('Control')
      for (let index = 0; index < 5; index += 1) {
        await page.mouse.wheel(0, -240)
      }
      await page.keyboard.up('Control')
      await page.waitForFunction(() => Boolean(window.__venusLastZoomDiagnostic))
      await page.waitForTimeout(250)
      const zoomVisibilityDebug = await page.evaluate(() => window.__venusZeroVisibilityDebug ?? null)
      assert.equal(zoomVisibilityDebug, null, 'zoom must not drop a populated scene to zero visibility')
      await page.waitForFunction(() => {
        return document.querySelector('[data-testid="editor.focus-root"]')?.getAttribute('data-focused') === 'true'
      })
      await focusRoot.focus()
      await page.keyboard.press('Control+a')
      await page.waitForFunction(() => {
        return document.querySelectorAll('[role="treeitem"][aria-selected="true"]').length > 1
      })

      await page.keyboard.press('Delete')
      await page.waitForFunction((previousCount) => {
        return document.querySelectorAll('[role="treeitem"]').length < previousCount
      }, initialLayerCount)
      const layerCountAfterDelete = await treeItems.count()
      assert.ok(layerCountAfterDelete < initialLayerCount, 'Delete shortcut should remove selected document nodes')

      await page.getByTestId('sidebar.left.switch-tab.history').click()
      await page.getByTestId('history.heading').waitFor()
      const historyTimeline = page.getByTestId('sidebar.left.history.timeline')
      const historyRows = historyTimeline.locator('button')
      await page.waitForFunction(() => {
        return document.querySelectorAll('[data-testid="sidebar.left.history.timeline"] button').length > 0
      })
      assert.equal(browserErrors.length, 0, `browser emitted errors: ${browserErrors.join('; ')}`)

      console.log(JSON.stringify({
        result: 'pass',
        initialLayerCount,
        layerCountAfterDelete,
        historyRowCount: await historyRows.count(),
        zoomVisibilityStable: true,
        routedSources: ['layer-tree-click', 'layer-tree-keyboard', 'shortcut-select-all', 'shortcut-delete'],
      }))
    } finally {
      await browser.close()
    }
  } catch (error) {
    if (serverOutput) {
      console.error(serverOutput)
    }
    throw error
  } finally {
    server.kill('SIGTERM')
  }
}

runSmoke().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error))
  process.exitCode = 1
})
