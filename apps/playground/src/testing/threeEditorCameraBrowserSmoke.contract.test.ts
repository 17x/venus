import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import test from 'node:test'
import zlib from 'node:zlib'
import {chromium, type Page} from 'playwright'

const distDir = path.resolve(process.cwd(), 'dist')

type BrowserCameraState = {
  yaw: number
  pitch: number
  distance: number
  targetX: number
  targetY: number
  targetZ: number
}

type BrowserWorldObject = {
  id: string
  x: number
  y: number
  z: number
  rotationYDeg?: number
  scaleZ?: number
}

type BrowserLightingState = {
  directionalIntensity: number
  ambientIntensity: number
  lightAzimuthDeg: number
  timeOfDayHours: number
  cloudCover: number
  precipitation: number
  fogDensity: number
}

type BrowserAtmosphereState = {
  skyColor: string
  hazeColor: string
  hazeOpacity: number
}

type BrowserAuthoringRuntimeParityState = {
  authoringNodeCount: number
  runtimeNodeCount: number
  authoringMaterialCount: number
  runtimeMaterialCount: number
  matching: boolean
  revisionDelta: number
  previewStepIndex: number
  authoringSignature: string
  runtimeSignature: string
}

type BrowserRuntimeApi = {
  getCameraState?: () => BrowserCameraState
  setCameraState?: (nextState: Partial<BrowserCameraState>) => Promise<void>
  getWorldObjects?: () => BrowserWorldObject[]
  getLightingState?: () => BrowserLightingState
  getLightingCollection?: () => unknown
  getAtmosphereState?: () => BrowserAtmosphereState
  getAuthoringRuntimeParityState?: () => BrowserAuthoringRuntimeParityState
  applyGizmoDrag?: (input: {
    entityId: string
    axis: 'x' | 'y' | 'z'
    mode: 'translate' | 'rotate' | 'scale'
    startX: number
    startY: number
    x: number
    y: number
  }) => Promise<void>
}

type CanvasDetailSample = {
  nonWhitePixels: number
  uniqueColors: number
  edgeTransitions: number
  selectionAccentPixels: number
}

const resolveContentType = (filePath: string): string => {
  const extension = path.extname(filePath)
  if (extension === '.html') return 'text/html; charset=utf-8'
  if (extension === '.js') return 'text/javascript; charset=utf-8'
  if (extension === '.css') return 'text/css; charset=utf-8'
  if (extension === '.png') return 'image/png'
  return 'application/octet-stream'
}

const createDistServer = async (): Promise<{url: string; close: () => Promise<void>}> => {
  assert.equal(fs.existsSync(path.join(distDir, 'index.html')), true, 'playground dist is missing; run pnpm -C apps/playground build first')
  const server = http.createServer((request, response) => {
    const parsedUrl = new URL(request.url ?? '/', 'http://127.0.0.1')
    const routePath = parsedUrl.pathname === '/' ? '/index.html' : parsedUrl.pathname
    const resolvedPath = path.normalize(path.join(distDir, decodeURIComponent(routePath)))
    const safePath = resolvedPath.startsWith(distDir) ? resolvedPath : path.join(distDir, 'index.html')
    const filePath = fs.existsSync(safePath) && fs.statSync(safePath).isFile()
      ? safePath
      : path.join(distDir, 'index.html')
    response.setHeader('Content-Type', resolveContentType(filePath))
    fs.createReadStream(filePath).pipe(response)
  })
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  assert.ok(address && typeof address === 'object')
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error)
        else resolve()
      })
    }),
  }
}

const readCameraState = async (page: Page): Promise<BrowserCameraState> => {
  return page.evaluate(() => {
    const runtimeApi = (globalThis as unknown as Record<string, BrowserRuntimeApi>).__venusPlayground3d
    const cameraState = runtimeApi?.getCameraState?.()
    if (!cameraState) {
      throw new Error('3d editor camera runtime API is missing')
    }
    return cameraState
  })
}

const setCameraState = async (page: Page, cameraState: Partial<BrowserCameraState>): Promise<void> => {
  await page.evaluate(async (nextState) => {
    const runtimeApi = (globalThis as unknown as Record<string, BrowserRuntimeApi>).__venusPlayground3d
    if (!runtimeApi?.setCameraState) {
      throw new Error('3d editor camera runtime API is missing setCameraState')
    }
    await runtimeApi.setCameraState(nextState)
  }, cameraState)
}

const readWorldObject = async (page: Page, entityId: string): Promise<BrowserWorldObject> => {
  return page.evaluate((targetEntityId) => {
    const runtimeApi = (globalThis as unknown as Record<string, BrowserRuntimeApi>).__venusPlayground3d
    const object = runtimeApi?.getWorldObjects?.().find((entry) => entry.id === targetEntityId)
    if (!object) {
      throw new Error(`3d editor object is missing: ${targetEntityId}`)
    }
    return object
  }, entityId)
}

const applyGizmoDrag = async (
  page: Page,
  input: Parameters<NonNullable<BrowserRuntimeApi['applyGizmoDrag']>>[0],
): Promise<void> => {
  await page.evaluate(async (dragInput) => {
    const runtimeApi = (globalThis as unknown as Record<string, BrowserRuntimeApi>).__venusPlayground3d
    if (!runtimeApi?.applyGizmoDrag) {
      throw new Error('3d editor transform runtime API is missing applyGizmoDrag')
    }
    await runtimeApi.applyGizmoDrag(dragInput)
  }, input)
}

const readLightingState = async (page: Page): Promise<BrowserLightingState> => {
  return page.evaluate(() => {
    const runtimeApi = (globalThis as unknown as Record<string, BrowserRuntimeApi>).__venusPlayground3d
    const lightingState = runtimeApi?.getLightingState?.()
    if (!lightingState) {
      throw new Error('3d editor lighting runtime API is missing')
    }
    return lightingState
  })
}

const readLightingCollectionSignature = async (page: Page): Promise<string> => {
  return page.evaluate(() => {
    const runtimeApi = (globalThis as unknown as Record<string, BrowserRuntimeApi>).__venusPlayground3d
    const collection = runtimeApi?.getLightingCollection?.()
    if (!collection) {
      throw new Error('3d editor lighting collection API is missing')
    }
    return JSON.stringify(collection)
  })
}

const readAtmosphereState = async (page: Page): Promise<BrowserAtmosphereState> => {
  return page.evaluate(() => {
    const runtimeApi = (globalThis as unknown as Record<string, BrowserRuntimeApi>).__venusPlayground3d
    const atmosphereState = runtimeApi?.getAtmosphereState?.()
    if (!atmosphereState) {
      throw new Error('3d editor atmosphere runtime API is missing')
    }
    return atmosphereState
  })
}

const readAuthoringRuntimeParityState = async (page: Page): Promise<BrowserAuthoringRuntimeParityState> => {
  return page.evaluate(() => {
    const runtimeApi = (globalThis as unknown as Record<string, BrowserRuntimeApi>).__venusPlayground3d
    const parityState = runtimeApi?.getAuthoringRuntimeParityState?.()
    if (!parityState) {
      throw new Error('3d editor authoring/runtime parity API is missing')
    }
    return parityState
  })
}

const setRangeValue = async (page: Page, selector: string, value: string): Promise<void> => {
  await page.locator(selector).evaluate((element, nextValue) => {
    const input = element as HTMLInputElement
    input.value = nextValue
    input.dispatchEvent(new Event('input', {bubbles: true}))
    input.dispatchEvent(new Event('change', {bubbles: true}))
  }, value)
}

const bytesPerPixelForPngColorType = (colorType: number): number => {
  if (colorType === 2) return 3
  if (colorType === 6) return 4
  throw new Error(`unsupported PNG color type: ${colorType}`)
}

const unfilterPngScanlines = (input: Buffer, width: number, height: number, bytesPerPixel: number): Buffer => {
  const rowBytes = width * bytesPerPixel
  const output = Buffer.alloc(rowBytes * height)
  let inputOffset = 0
  for (let y = 0; y < height; y += 1) {
    const filter = input[inputOffset]
    inputOffset += 1
    const rowStart = y * rowBytes
    for (let x = 0; x < rowBytes; x += 1) {
      const raw = input[inputOffset + x] ?? 0
      const left = x >= bytesPerPixel ? output[rowStart + x - bytesPerPixel] ?? 0 : 0
      const up = y > 0 ? output[rowStart + x - rowBytes] ?? 0 : 0
      const upLeft = y > 0 && x >= bytesPerPixel ? output[rowStart + x - rowBytes - bytesPerPixel] ?? 0 : 0
      let value = raw
      if (filter === 1) value = raw + left
      else if (filter === 2) value = raw + up
      else if (filter === 3) value = raw + Math.floor((left + up) / 2)
      else if (filter === 4) {
        const predictor = left + up - upLeft
        const distanceLeft = Math.abs(predictor - left)
        const distanceUp = Math.abs(predictor - up)
        const distanceUpLeft = Math.abs(predictor - upLeft)
        value = raw + (distanceLeft <= distanceUp && distanceLeft <= distanceUpLeft ? left : distanceUp <= distanceUpLeft ? up : upLeft)
      } else if (filter !== 0) {
        throw new Error(`unsupported PNG filter: ${filter}`)
      }
      output[rowStart + x] = value & 0xff
    }
    inputOffset += rowBytes
  }
  return output
}

const sampleCanvasDetail = async (page: Page): Promise<CanvasDetailSample> => {
  const png = await page.locator('#playground-canvas').screenshot()
  return samplePngDetail(png)
}

const sampleCanvasFrameDetail = async (page: Page): Promise<CanvasDetailSample> => {
  const png = await page.locator('.canvas-frame').screenshot()
  return samplePngDetail(png)
}

const samplePngDetail = (png: Buffer): CanvasDetailSample => {
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
  let offset = 8
  let width = 0
  let height = 0
  let bytesPerPixel = 0
  const idatChunks: Buffer[] = []
  while (offset < png.length) {
    const length = png.readUInt32BE(offset)
    const type = png.subarray(offset + 4, offset + 8).toString('ascii')
    const data = png.subarray(offset + 8, offset + 8 + length)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      assert.equal(data[8], 8)
      bytesPerPixel = bytesPerPixelForPngColorType(data[9] ?? 0)
    } else if (type === 'IDAT') {
      idatChunks.push(data)
    } else if (type === 'IEND') {
      break
    }
    offset += 12 + length
  }
  assert.equal(width > 0 && height > 0, true)
  const pixels = unfilterPngScanlines(zlib.inflateSync(Buffer.concat(idatChunks)), width, height, bytesPerPixel)
  const colors = new Set<string>()
  let nonWhitePixels = 0
  let edgeTransitions = 0
  let selectionAccentPixels = 0
  const stride = 1
  for (let pixelIndex = 0; pixelIndex < width * height; pixelIndex += stride) {
    const pixelOffset = pixelIndex * bytesPerPixel
    const red = pixels[pixelOffset] ?? 0
    const green = pixels[pixelOffset + 1] ?? 0
    const blue = pixels[pixelOffset + 2] ?? 0
    const alpha = bytesPerPixel === 4 ? pixels[pixelOffset + 3] ?? 255 : 255
    colors.add(`${red},${green},${blue},${alpha}`)
    if (alpha > 0 && (red < 245 || green < 245 || blue < 245)) {
      nonWhitePixels += 1
    }
    if (alpha > 0 && red > 180 && green > 95 && green < 210 && blue < 95) {
      selectionAccentPixels += 1
    }
    const rightPixelOffset = pixelOffset + bytesPerPixel
    if (rightPixelOffset < pixels.length) {
      const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722
      const nextLuminance = (pixels[rightPixelOffset] ?? 0) * 0.2126
        + (pixels[rightPixelOffset + 1] ?? 0) * 0.7152
        + (pixels[rightPixelOffset + 2] ?? 0) * 0.0722
      if (Math.abs(luminance - nextLuminance) > 16) {
        edgeTransitions += 1
      }
    }
  }
  return {nonWhitePixels, uniqueColors: colors.size, edgeTransitions, selectionAccentPixels}
}

const boxesOverlap = (
  a: {x: number; y: number; width: number; height: number},
  b: {x: number; y: number; width: number; height: number},
): boolean => {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y
}

const waitForStableDrawStatus = async (page: Page): Promise<void> => {
  await page.waitForFunction(() => {
    const statusLine = document.querySelector<HTMLElement>('#status-line')
    if (!statusLine) return false
    const text = statusLine.textContent ?? ''
    const nodes = Number(text.match(/nodes (\d+)/)?.[1] ?? 0)
    const draw = Number(text.match(/draw (\d+)/)?.[1] ?? 0)
    return nodes > 0 && draw > 0 && text.includes('grid on')
  }, {timeout: 15000})
}

test('3d editor camera interactions keep grid and objects rendering after orbit pan and zoom', async () => {
  const server = await createDistServer()
  const browser = await chromium.launch({headless: true})
  const page = await browser.newPage({viewport: {width: 1280, height: 760}})

  try {
    await page.goto(`${server.url}/index.html#/3dEditor`, {waitUntil: 'domcontentloaded', timeout: 15000})
    await page.waitForSelector('#playground-canvas', {timeout: 15000})
    await waitForStableDrawStatus(page)

    const canvasBox = await page.locator('#playground-canvas').boundingBox()
    assert.ok(canvasBox)
    const centerX = canvasBox.x + canvasBox.width * 0.5
    const centerY = canvasBox.y + canvasBox.height * 0.5
    const initialState = await readCameraState(page)

    await page.mouse.move(centerX, centerY)
    await page.mouse.down()
    await page.mouse.move(centerX + 80, centerY - 60, {steps: 6})
    await page.mouse.up()
    await page.waitForFunction((previousState) => {
      const runtimeApi = (globalThis as unknown as Record<string, BrowserRuntimeApi>).__venusPlayground3d
      const cameraState = runtimeApi?.getCameraState?.()
      return Boolean(cameraState)
        && Math.abs((cameraState?.yaw ?? previousState.yaw) - previousState.yaw) > 0.1
        && Math.abs((cameraState?.pitch ?? previousState.pitch) - previousState.pitch) > 0.1
    }, initialState, {timeout: 15000})
    await waitForStableDrawStatus(page)

    const afterOrbitState = await readCameraState(page)
    await page.keyboard.down('Shift')
    await page.mouse.move(centerX, centerY)
    await page.mouse.down()
    await page.mouse.move(centerX + 60, centerY + 40, {steps: 5})
    await page.mouse.up()
    await page.keyboard.up('Shift')
    await page.waitForFunction((previousState) => {
      const runtimeApi = (globalThis as unknown as Record<string, BrowserRuntimeApi>).__venusPlayground3d
      const cameraState = runtimeApi?.getCameraState?.()
      return Boolean(cameraState)
        && Math.hypot(
          (cameraState?.targetX ?? previousState.targetX) - previousState.targetX,
          (cameraState?.targetY ?? previousState.targetY) - previousState.targetY,
          (cameraState?.targetZ ?? previousState.targetZ) - previousState.targetZ,
        ) > 0.1
    }, afterOrbitState, {timeout: 15000})
    await waitForStableDrawStatus(page)

    const afterPanState = await readCameraState(page)
    await page.mouse.move(centerX, centerY)
    await page.mouse.wheel(0, -240)
    await page.waitForFunction((previousState) => {
      const runtimeApi = (globalThis as unknown as Record<string, BrowserRuntimeApi>).__venusPlayground3d
      const cameraState = runtimeApi?.getCameraState?.()
      return Boolean(cameraState)
        && Math.abs((cameraState?.distance ?? previousState.distance) - previousState.distance) > 0.1
    }, afterPanState, {timeout: 15000})
    await waitForStableDrawStatus(page)

    const finalState = await readCameraState(page)
    assert.equal([
      finalState.yaw,
      finalState.pitch,
      finalState.distance,
      finalState.targetX,
      finalState.targetY,
      finalState.targetZ,
    ].every(Number.isFinite), true)
  } finally {
    await browser.close()
    await server.close()
  }
})

test('3d editor grid screenshot detail remains present across near mid and far camera states', async () => {
  const server = await createDistServer()
  const browser = await chromium.launch({headless: true})
  const page = await browser.newPage({viewport: {width: 1280, height: 760}})

  try {
    await page.goto(`${server.url}/index.html#/3dEditor`, {waitUntil: 'domcontentloaded', timeout: 15000})
    await page.waitForSelector('#playground-canvas', {timeout: 15000})
    await waitForStableDrawStatus(page)

    const cameraStates = [
      {label: 'near', yaw: 0, pitch: 18, distance: 320},
      {label: 'mid', yaw: 34, pitch: 42, distance: 720},
      {label: 'far', yaw: -55, pitch: 28, distance: 1800},
    ]

    for (const state of cameraStates) {
      await setCameraState(page, {
        yaw: state.yaw,
        pitch: state.pitch,
        distance: state.distance,
        targetX: 0,
        targetY: 0,
        targetZ: 0,
      })
      await waitForStableDrawStatus(page)
      const sample = await sampleCanvasDetail(page)
      const sampleLabel = `${state.label} camera sample ${JSON.stringify(sample)}`
      assert.equal(sample.nonWhitePixels > 800, true, `${sampleLabel} should keep the grid canvas nonblank`)
      assert.equal(sample.uniqueColors > 16, true, `${sampleLabel} should preserve textured/grid color detail`)
      assert.equal(sample.edgeTransitions > 50, true, `${sampleLabel} should preserve visible grid/object line detail`)
    }
  } finally {
    await browser.close()
    await server.close()
  }
})

test('3d editor selected mesh remains readable with visible selection accent', async () => {
  const server = await createDistServer()
  const browser = await chromium.launch({headless: true})
  const page = await browser.newPage({viewport: {width: 1280, height: 760}})

  try {
    await page.goto(`${server.url}/index.html#/3dEditor`, {waitUntil: 'domcontentloaded', timeout: 15000})
    await page.waitForSelector('#playground-canvas', {timeout: 15000})
    await waitForStableDrawStatus(page)

    await page.locator('#doc-model-list li', {hasText: 'Main Cube'}).click()
    await page.waitForFunction(() => {
      const hitState = document.querySelector<HTMLElement>('#hit-state')
      const statusLine = document.querySelector<HTMLElement>('#status-line')
      return Boolean(hitState?.textContent?.includes('selected mesh-main-cube'))
        && Boolean(statusLine?.textContent?.includes('selected mesh-main-cube'))
    }, {timeout: 15000})
    await waitForStableDrawStatus(page)

    const sample = await sampleCanvasDetail(page)
    const sampleLabel = `selected mesh sample ${JSON.stringify(sample)}`
    assert.equal(sample.nonWhitePixels > 800, true, `${sampleLabel} should keep selected mesh readable`)
    assert.equal(sample.uniqueColors > 16, true, `${sampleLabel} should keep selected mesh color detail`)
    assert.equal(sample.edgeTransitions > 50, true, `${sampleLabel} should keep selected mesh edge detail`)
    assert.equal(sample.selectionAccentPixels > 4, true, `${sampleLabel} should expose selection accent pixels`)
  } finally {
    await browser.close()
    await server.close()
  }
})

test('3d editor transform controls mutate selected object deterministically', async () => {
  const server = await createDistServer()
  const browser = await chromium.launch({headless: true})
  const page = await browser.newPage({viewport: {width: 1280, height: 760}})

  try {
    await page.goto(`${server.url}/index.html#/3dEditor`, {waitUntil: 'domcontentloaded', timeout: 15000})
    await page.waitForSelector('#playground-canvas', {timeout: 15000})
    await waitForStableDrawStatus(page)
    await page.locator('#doc-model-list li', {hasText: 'Main Cube'}).click()
    await page.waitForFunction(() => document.querySelector<HTMLElement>('#hit-state')?.textContent?.includes('selected mesh-main-cube') === true, {timeout: 15000})

    const before = await readWorldObject(page, 'mesh-main-cube')
    await applyGizmoDrag(page, {entityId: 'mesh-main-cube', axis: 'x', mode: 'translate', startX: 100, startY: 100, x: 125, y: 140})
    const afterTranslate = await readWorldObject(page, 'mesh-main-cube')
    assert.equal(afterTranslate.x > before.x, true)
    assert.equal(afterTranslate.y, before.y)
    assert.equal(afterTranslate.z, before.z)

    await applyGizmoDrag(page, {entityId: 'mesh-main-cube', axis: 'y', mode: 'rotate', startX: 100, startY: 100, x: 140, y: 85})
    const afterRotate = await readWorldObject(page, 'mesh-main-cube')
    assert.equal((afterRotate.rotationYDeg ?? 0) > (afterTranslate.rotationYDeg ?? 0), true)

    await applyGizmoDrag(page, {entityId: 'mesh-main-cube', axis: 'z', mode: 'scale', startX: 100, startY: 100, x: 150, y: 70})
    const afterScale = await readWorldObject(page, 'mesh-main-cube')
    assert.equal((afterScale.scaleZ ?? 1) > (afterRotate.scaleZ ?? 1), true)

    await waitForStableDrawStatus(page)
    await page.waitForFunction(() => document.querySelector<HTMLElement>('#doc-model-list')?.textContent?.includes('Main Cube [face] | layer objects | t(') === true, {timeout: 15000})
    const sample = await sampleCanvasDetail(page)
    assert.equal(sample.nonWhitePixels > 800, true)
    assert.equal(sample.edgeTransitions > 50, true)
  } finally {
    await browser.close()
    await server.close()
  }
})

test('3d editor global gizmo overlay is unique fixed non-overlapping and camera-aware', async () => {
  const server = await createDistServer()
  const browser = await chromium.launch({headless: true})
  const page = await browser.newPage({viewport: {width: 1280, height: 760}})

  try {
    await page.goto(`${server.url}/index.html#/3dEditor`, {waitUntil: 'domcontentloaded', timeout: 15000})
    await page.waitForSelector('#global-gizmo-overlay', {timeout: 15000})
    await waitForStableDrawStatus(page)

    assert.equal(await page.locator('#global-gizmo-overlay').count(), 1)
    const overlayStyle = await page.locator('#global-gizmo-overlay').evaluate((element) => {
      const style = getComputedStyle(element)
      return {pointerEvents: style.pointerEvents, position: style.position}
    })
    assert.equal(overlayStyle.pointerEvents, 'none')
    assert.equal(overlayStyle.position, 'absolute')

    const overlayBox = await page.locator('#global-gizmo-overlay').boundingBox()
    const frameBox = await page.locator('.canvas-frame').boundingBox()
    const leftPanelBox = await page.locator('.vector-side-panel-left').boundingBox()
    const rightPanelBox = await page.locator('.vector-side-panel-right').boundingBox()
    const commandGroupBox = await page.locator('#command-group').boundingBox()
    assert.ok(overlayBox)
    assert.ok(frameBox)
    assert.ok(leftPanelBox)
    assert.ok(rightPanelBox)
    assert.ok(commandGroupBox)

    assert.equal(Math.abs(overlayBox.y - (frameBox.y + 12)) <= 2, true)
    assert.equal(Math.abs((frameBox.x + frameBox.width) - (overlayBox.x + overlayBox.width) - 12) <= 2, true)
    assert.equal(boxesOverlap(overlayBox, leftPanelBox), false)
    assert.equal(boxesOverlap(overlayBox, rightPanelBox), false)
    assert.equal(boxesOverlap(overlayBox, commandGroupBox), false)

    const firstScreenshot = await page.locator('#global-gizmo-overlay').screenshot()
    const firstSample = samplePngDetail(firstScreenshot)
    assert.equal(firstSample.nonWhitePixels > 100, true)
    assert.equal(firstSample.uniqueColors > 4, true)

    await setCameraState(page, {yaw: 70, pitch: 44, distance: 720, targetX: 0, targetY: 0, targetZ: 0})
    await waitForStableDrawStatus(page)
    const secondScreenshot = await page.locator('#global-gizmo-overlay').screenshot()
    const secondSample = samplePngDetail(secondScreenshot)
    assert.equal(secondSample.nonWhitePixels > 100, true)
    assert.equal(secondScreenshot.equals(firstScreenshot), false, 'global gizmo overlay should redraw when camera orientation changes')
  } finally {
    await browser.close()
    await server.close()
  }
})

test('3d editor environment lighting controls update status and active lighting output', async () => {
  const server = await createDistServer()
  const browser = await chromium.launch({headless: true})
  const page = await browser.newPage({viewport: {width: 1280, height: 760}})

  try {
    await page.goto(`${server.url}/index.html#/3dEditor`, {waitUntil: 'domcontentloaded', timeout: 15000})
    await page.waitForSelector('#playground-canvas', {timeout: 15000})
    await waitForStableDrawStatus(page)

    const controls: Array<{
      key: keyof BrowserLightingState
      value: string
      statusToken: string
    }> = [
      {key: 'directionalIntensity', value: '2.10', statusToken: 'dirI 2.10'},
      {key: 'ambientIntensity', value: '0.74', statusToken: 'ambI 0.74'},
      {key: 'lightAzimuthDeg', value: '128', statusToken: 'lightDir 128.0'},
      {key: 'timeOfDayHours', value: '22.4', statusToken: 'time 22.4'},
      {key: 'cloudCover', value: '0.63', statusToken: 'cloud 0.63'},
      {key: 'precipitation', value: '0.38', statusToken: 'rain 0.38'},
      {key: 'fogDensity', value: '0.52', statusToken: 'fog 0.52'},
    ]

    for (const control of controls) {
      const beforeLighting = await readLightingState(page)
      const beforeCollectionSignature = await readLightingCollectionSignature(page)
      await setRangeValue(page, `input[data-three-editor-setting="${control.key}"]`, control.value)
      await page.waitForFunction(({key, previousValue, expectedToken}) => {
        const runtimeApi = (globalThis as unknown as Record<string, BrowserRuntimeApi>).__venusPlayground3d
        const lightingState = runtimeApi?.getLightingState?.()
        const statusText = document.querySelector<HTMLElement>('#status-line')?.textContent ?? ''
        return Boolean(lightingState)
          && Math.abs((lightingState?.[key as keyof BrowserLightingState] ?? previousValue) - previousValue) > 0.0001
          && statusText.includes(expectedToken)
          && statusText.includes('activeLights 3')
      }, {
        key: control.key,
        previousValue: beforeLighting[control.key],
        expectedToken: control.statusToken,
      }, {timeout: 15000})
      await waitForStableDrawStatus(page)
      const afterCollectionSignature = await readLightingCollectionSignature(page)
      assert.notEqual(afterCollectionSignature, beforeCollectionSignature, `${control.key} should change active engine lighting output`)
    }
  } finally {
    await browser.close()
    await server.close()
  }
})

test('3d editor atmosphere haze responds to weather without obscuring selected transform controls', async () => {
  const server = await createDistServer()
  const browser = await chromium.launch({headless: true})
  const page = await browser.newPage({viewport: {width: 1280, height: 760}})

  try {
    await page.goto(`${server.url}/index.html#/3dEditor`, {waitUntil: 'domcontentloaded', timeout: 15000})
    await page.waitForSelector('#atmosphere-haze-layer', {timeout: 15000})
    await waitForStableDrawStatus(page)
    await page.locator('#doc-model-list li', {hasText: 'Main Cube'}).click()
    await page.waitForFunction(() => document.querySelector<HTMLElement>('#hit-state')?.textContent?.includes('selected mesh-main-cube') === true, {timeout: 15000})

    const beforeAtmosphere = await readAtmosphereState(page)
    await setRangeValue(page, 'input[data-three-editor-setting="cloudCover"]', '0.72')
    await setRangeValue(page, 'input[data-three-editor-setting="precipitation"]', '0.44')
    await setRangeValue(page, 'input[data-three-editor-setting="fogDensity"]', '0.68')
    await page.waitForFunction((previousOpacity) => {
      const runtimeApi = (globalThis as unknown as Record<string, BrowserRuntimeApi>).__venusPlayground3d
      const atmosphereState = runtimeApi?.getAtmosphereState?.()
      const statusText = document.querySelector<HTMLElement>('#status-line')?.textContent ?? ''
      return Boolean(atmosphereState)
        && (atmosphereState?.hazeOpacity ?? 0) > previousOpacity
        && statusText.includes('cloud 0.72')
        && statusText.includes('rain 0.44')
        && statusText.includes('fog 0.68')
        && statusText.includes('haze ')
    }, beforeAtmosphere.hazeOpacity, {timeout: 15000})
    await waitForStableDrawStatus(page)

    const afterAtmosphere = await readAtmosphereState(page)
    assert.equal(afterAtmosphere.hazeOpacity > beforeAtmosphere.hazeOpacity, true)
    assert.notEqual(afterAtmosphere.hazeColor, beforeAtmosphere.hazeColor)

    const hazeStyle = await page.locator('#atmosphere-haze-layer').evaluate((element) => {
      const style = getComputedStyle(element)
      return {
        opacity: Number.parseFloat(style.opacity),
        pointerEvents: style.pointerEvents,
        backgroundImage: style.backgroundImage,
      }
    })
    assert.equal(hazeStyle.opacity > 0.1, true)
    assert.equal(hazeStyle.pointerEvents, 'none')
    assert.equal(hazeStyle.backgroundImage.includes('linear-gradient'), true)

    const frameSample = await sampleCanvasFrameDetail(page)
    const sampleLabel = `haze frame sample ${JSON.stringify(frameSample)}`
    assert.equal(frameSample.nonWhitePixels > 800, true, `${sampleLabel} should keep the editor frame readable`)
    assert.equal(frameSample.edgeTransitions > 50, true, `${sampleLabel} should preserve transform/control edge detail`)
    assert.equal(frameSample.selectionAccentPixels > 4, true, `${sampleLabel} should keep selected transform accents visible`)
  } finally {
    await browser.close()
    await server.close()
  }
})

test('3d editor authoring runtime split probe exposes counts and parity state', async () => {
  const server = await createDistServer()
  const browser = await chromium.launch({headless: true})
  const page = await browser.newPage({viewport: {width: 1280, height: 760}})

  try {
    await page.goto(`${server.url}/index.html#/3dEditor`, {waitUntil: 'domcontentloaded', timeout: 15000})
    await page.waitForSelector('#authoring-runtime-state', {timeout: 15000})
    await waitForStableDrawStatus(page)

    const initialParity = await readAuthoringRuntimeParityState(page)
    assert.equal(initialParity.matching, true)
    assert.equal(initialParity.revisionDelta, 0)
    assert.equal(initialParity.authoringNodeCount, initialParity.runtimeNodeCount)
    assert.equal(initialParity.authoringMaterialCount, initialParity.runtimeMaterialCount)
    assert.equal(initialParity.authoringSignature, initialParity.runtimeSignature)
    assert.equal(initialParity.authoringNodeCount > 0, true)

    const uiText = await page.locator('#authoring-runtime-state').textContent()
    assert.ok(uiText?.includes(`authoring ${initialParity.authoringNodeCount}/${initialParity.authoringMaterialCount}`))
    assert.ok(uiText?.includes(`runtime ${initialParity.runtimeNodeCount}/${initialParity.runtimeMaterialCount}`))
    assert.ok(uiText?.includes('parity true'))
    const statusText = await page.locator('#status-line').textContent()
    assert.ok(statusText?.includes(`authoring ${initialParity.authoringNodeCount}/${initialParity.authoringMaterialCount}`))
    assert.ok(statusText?.includes(`runtime ${initialParity.runtimeNodeCount}/${initialParity.runtimeMaterialCount}`))

    await page.locator('#doc-model-list li', {hasText: 'Main Cube'}).click()
    await page.waitForFunction((previousStep) => {
      const runtimeApi = (globalThis as unknown as Record<string, BrowserRuntimeApi>).__venusPlayground3d
      const parityState = runtimeApi?.getAuthoringRuntimeParityState?.()
      return Boolean(parityState)
        && parityState?.matching === true
        && parityState.previewStepIndex > previousStep
        && parityState.authoringNodeCount === parityState.runtimeNodeCount
    }, initialParity.previewStepIndex, {timeout: 15000})
    const afterSelectionParity = await readAuthoringRuntimeParityState(page)
    assert.equal(afterSelectionParity.authoringSignature, afterSelectionParity.runtimeSignature)
    assert.equal(afterSelectionParity.authoringNodeCount, afterSelectionParity.runtimeNodeCount)
  } finally {
    await browser.close()
    await server.close()
  }
})
