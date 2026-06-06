#!/usr/bin/env node

import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import process from 'node:process'
import {chromium} from 'playwright'

const HOST = '127.0.0.1'
const PORT = 4179
const URL = `http://${HOST}:${PORT}`
const DOCUMENT_SIZE = {width: 960, height: 640}
const WORLD_DRAG_TOLERANCE = 3

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

function resolveInitialViewport(stageBox) {
  const horizontalPadding = Math.max(32, stageBox.width * 0.08)
  const verticalPadding = Math.max(32, stageBox.height * 0.08)
  const availableWidth = Math.max(1, stageBox.width - horizontalPadding * 2)
  const availableHeight = Math.max(1, stageBox.height - verticalPadding * 2)
  const scale = Math.min(availableWidth / DOCUMENT_SIZE.width, availableHeight / DOCUMENT_SIZE.height)
  return {
    scale,
    offsetX: (stageBox.width - DOCUMENT_SIZE.width * scale) / 2,
    offsetY: (stageBox.height - DOCUMENT_SIZE.height * scale) / 2,
  }
}

function resolveShapeCenterScreen(stageBox, viewport, shape) {
  return {
    x: stageBox.x + viewport.offsetX + (shape.x + shape.width / 2) * viewport.scale,
    y: stageBox.y + viewport.offsetY + (shape.y + shape.height / 2) * viewport.scale,
  }
}

async function setInspectorNumber(page, label, value) {
  const input = page.getByRole('textbox', {name: label, exact: true}).first()
  await input.click()
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A')
  await page.keyboard.type(String(value))
  await input.blur()
  await page.waitForFunction(
    ({label: inputLabel, expected}) => {
      const target = Array.from(document.querySelectorAll('input[aria-label]'))
        .find((candidate) => candidate.getAttribute('aria-label') === inputLabel)
      return target instanceof HTMLInputElement && Number.parseFloat(target.value) === expected
    },
    {label, expected: value},
  )
}

async function readInspectorNumber(page, label) {
  const value = await page.getByRole('textbox', {name: label, exact: true}).first().inputValue()
  const parsed = Number.parseFloat(value)
  assert.ok(Number.isFinite(parsed), `${label} inspector field should contain a number, received ${value}`)
  return parsed
}

async function runReplay() {
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

      await page.getByTestId('editor.stage').waitFor()
      const analyticsLayer = page.getByRole('treeitem', {name: /Analytics Card/})
      await analyticsLayer.click()
      await page.waitForFunction(() => {
        return Array.from(document.querySelectorAll('[role="treeitem"]')).some((candidate) =>
          candidate.textContent?.includes('Analytics Card') &&
          candidate.getAttribute('aria-selected') === 'true',
        )
      })

      await setInspectorNumber(page, 'X', 220)
      await setInspectorNumber(page, 'Y', 240)
      await setInspectorNumber(page, 'Rotation', 30)

      const stageBox = await page.getByTestId('editor.stage').boundingBox()
      assert.ok(stageBox, 'editor stage should expose pointer bounds')
      const viewport = resolveInitialViewport(stageBox)
      const targetCenter = resolveShapeCenterScreen(stageBox, viewport, {
        x: 220,
        y: 240,
        width: 180,
        height: 104,
      })

      // Click and drag from the post-transform rendered center. A stale hit-test
      // index would leave Inspector X/Y unchanged or select another element.
      await page.mouse.move(targetCenter.x, targetCenter.y)
      await page.mouse.down()
      await page.mouse.move(targetCenter.x + 64, targetCenter.y + 42, {steps: 6})
      await page.mouse.up()

      const expectedX = 220 + 64 / viewport.scale
      const expectedY = 240 + 42 / viewport.scale
      await page.waitForFunction(
        ({x, y, tolerance}) => {
          const findValue = (label) => {
            const target = Array.from(document.querySelectorAll('input[aria-label]'))
              .find((candidate) => candidate.getAttribute('aria-label') === label)
            return target instanceof HTMLInputElement ? Number.parseFloat(target.value) : Number.NaN
          }
          return Math.abs(findValue('X') - x) < tolerance && Math.abs(findValue('Y') - y) < tolerance
        },
        {x: expectedX, y: expectedY, tolerance: WORLD_DRAG_TOLERANCE},
      )

      const actualX = await readInspectorNumber(page, 'X')
      const actualY = await readInspectorNumber(page, 'Y')
      const actualRotation = await readInspectorNumber(page, 'Rotation')
      assert.equal(actualRotation, 30, 'drag should preserve selected shape rotation')
      assert.ok(Math.abs(actualX - expectedX) < WORLD_DRAG_TOLERANCE, `drag X should follow rendered point, expected ${expectedX}, received ${actualX}`)
      assert.ok(Math.abs(actualY - expectedY) < WORLD_DRAG_TOLERANCE, `drag Y should follow rendered point, expected ${expectedY}, received ${actualY}`)
      assert.equal(browserErrors.length, 0, `browser emitted errors: ${browserErrors.join('; ')}`)

      console.log(JSON.stringify({
        result: 'pass',
        target: 'card-analytics',
        viewportScale: Number(viewport.scale.toFixed(4)),
        expected: {
          x: Number(expectedX.toFixed(2)),
          y: Number(expectedY.toFixed(2)),
          rotation: 30,
        },
        actual: {
          x: actualX,
          y: actualY,
          rotation: actualRotation,
        },
        routedSources: ['layer-row-select', 'inspector-transform-fields', 'canvas-post-transform-drag'],
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

runReplay().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error))
  process.exitCode = 1
})
