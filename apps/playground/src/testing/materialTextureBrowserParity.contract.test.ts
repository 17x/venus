import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import test from 'node:test'
import zlib from 'node:zlib'
import {chromium, type Page} from 'playwright'

const distDir = path.resolve(process.cwd(), 'dist')

const resolveContentType = (filePath: string): string => {
  const extension = path.extname(filePath)
  if (extension === '.html') return 'text/html; charset=utf-8'
  if (extension === '.js') return 'text/javascript; charset=utf-8'
  if (extension === '.css') return 'text/css; charset=utf-8'
  if (extension === '.png') return 'image/png'
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg'
  return 'application/octet-stream'
}

const createDistServer = async (): Promise<{url: string; close: () => Promise<void>}> => {
  assert.equal(fs.existsSync(path.join(distDir, 'index.html')), true, 'playground dist is missing; run pnpm -C apps/playground build first')

  const server = http.createServer((request, response) => {
    const rawUrl = request.url ?? '/'
    const parsedUrl = new URL(rawUrl, 'http://127.0.0.1')
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
        const paeth = distanceLeft <= distanceUp && distanceLeft <= distanceUpLeft
          ? left
          : distanceUp <= distanceUpLeft
            ? up
            : upLeft
        value = raw + paeth
      } else if (filter !== 0) {
        throw new Error(`unsupported PNG filter: ${filter}`)
      }
      output[rowStart + x] = value & 0xff
    }
    inputOffset += rowBytes
  }
  return output
}

type CanvasSample = {
  nonWhitePixels: number
  uniqueColors: number
  averageRed: number
  averageGreen: number
  averageBlue: number
}

const samplePng = (png: Buffer): CanvasSample => {
  const signature = png.subarray(0, 8).toString('hex')
  assert.equal(signature, '89504e470d0a1a0a')
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
      const bitDepth = data[8]
      assert.equal(bitDepth, 8)
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
  let sampledPixels = 0
  let redSum = 0
  let greenSum = 0
  let blueSum = 0
  const stride = Math.max(1, Math.floor((width * height) / 4096))
  for (let pixelIndex = 0; pixelIndex < width * height; pixelIndex += stride) {
    const pixelOffset = pixelIndex * bytesPerPixel
    const red = pixels[pixelOffset] ?? 0
    const green = pixels[pixelOffset + 1] ?? 0
    const blue = pixels[pixelOffset + 2] ?? 0
    const alpha = bytesPerPixel === 4 ? pixels[pixelOffset + 3] ?? 255 : 255
    colors.add(`${red},${green},${blue},${alpha}`)
    redSum += red
    greenSum += green
    blueSum += blue
    sampledPixels += 1
    if (alpha > 0 && (red < 245 || green < 245 || blue < 245)) {
      nonWhitePixels += 1
    }
  }
  return {
    nonWhitePixels,
    uniqueColors: colors.size,
    averageRed: redSum / Math.max(1, sampledPixels),
    averageGreen: greenSum / Math.max(1, sampledPixels),
    averageBlue: blueSum / Math.max(1, sampledPixels),
  }
}

const sampleCanvas = async (page: Page, selector: string): Promise<CanvasSample> => {
  const screenshot = await page.locator(selector).screenshot()
  return samplePng(screenshot)
}

const averageColorDistance = (a: CanvasSample, b: CanvasSample): number => {
  return Math.abs(a.averageRed - b.averageRed)
    + Math.abs(a.averageGreen - b.averageGreen)
    + Math.abs(a.averageBlue - b.averageBlue)
}

const setRangeValue = async (page: Page, selector: string, value: string): Promise<void> => {
  await page.locator(selector).evaluate((element, nextValue) => {
    const input = element as HTMLInputElement
    input.value = nextValue
    input.dispatchEvent(new Event('input', {bubbles: true}))
    input.dispatchEvent(new Event('change', {bubbles: true}))
  }, value)
}

test('driving game route proves decoded WebGL material texture upload on nonblank canvas', async () => {
  const server = await createDistServer()
  const browser = await chromium.launch({headless: true})
  const page = await browser.newPage({viewport: {width: 1280, height: 760}})

  try {
    await page.goto(`${server.url}/index.html#/driving-game`, {waitUntil: 'domcontentloaded', timeout: 15000})
    await page.waitForSelector('#gc', {timeout: 15000})
    await page.waitForFunction(() => {
      const target = document.querySelector<HTMLElement>('#db')
      if (!target) return false
      const candidateCount = Number(target.dataset.webglMaterialTextureCandidateCount ?? 0)
      const uvReadyCount = Number(target.dataset.webglMaterialTextureUvReadyCount ?? 0)
      const bindingCount = Number(target.dataset.webglMaterialTextureBindingCount ?? 0)
      const decodedUploadObserved = target.dataset.webglMaterialTextureDecodedUploadObserved === 'true'
      const fallbackReason = target.dataset.webglMaterialTextureFallbackReason ?? 'none'
      return candidateCount >= 2
        && uvReadyCount >= 2
        && bindingCount >= 2
        && decodedUploadObserved
        && fallbackReason === 'none'
    }, {timeout: 15000})

    const sample = await sampleCanvas(page, '#gc')
    assert.equal(sample.nonWhitePixels > 0, true)
    assert.equal(sample.uniqueColors > 1, true)
  } finally {
    await browser.close()
    await server.close()
  }
})

test('3d editor route proves decoded WebGL material texture upload on nonblank canvas', async () => {
  const server = await createDistServer()
  const browser = await chromium.launch({headless: true})
  const page = await browser.newPage({viewport: {width: 1280, height: 760}})

  try {
    await page.goto(`${server.url}/index.html#/3dEditor`, {waitUntil: 'domcontentloaded', timeout: 15000})
    await page.waitForSelector('#playground-canvas', {timeout: 15000})
    await page.waitForFunction(() => {
      const target = document.querySelector<HTMLElement>('#status-line')
      if (!target) return false
      const candidateCount = Number(target.dataset.webglMaterialTextureCandidateCount ?? 0)
      const uvReadyCount = Number(target.dataset.webglMaterialTextureUvReadyCount ?? 0)
      const bindingCount = Number(target.dataset.webglMaterialTextureBindingCount ?? 0)
      const decodedUploadObserved = target.dataset.webglMaterialTextureDecodedUploadObserved === 'true'
      const fallbackReason = target.dataset.webglMaterialTextureFallbackReason ?? 'none'
      return candidateCount >= 2
        && uvReadyCount >= 2
        && bindingCount >= 2
        && decodedUploadObserved
        && fallbackReason === 'none'
    }, {timeout: 15000})

    const sample = await sampleCanvas(page, '#playground-canvas')
    assert.equal(sample.nonWhitePixels > 0, true)
    assert.equal(sample.uniqueColors > 1, true)
  } finally {
    await browser.close()
    await server.close()
  }
})

test('driving game route screenshot changes when runtime lighting rig is toggled', async () => {
  const server = await createDistServer()
  const browser = await chromium.launch({headless: true})
  const page = await browser.newPage({viewport: {width: 1280, height: 760}})

  try {
    await page.goto(`${server.url}/index.html#/driving-game`, {waitUntil: 'domcontentloaded', timeout: 15000})
    await page.waitForSelector('#gc', {timeout: 15000})
    await page.waitForSelector('input[data-s="lightRigEnabled"]', {timeout: 15000})
    const timeFlow = page.locator('input[data-s="timeFlowEnabled"]')
    if (await timeFlow.isChecked()) {
      await timeFlow.click()
    }
    await setRangeValue(page, 'input[data-s="timeOfDayHours"]', '22')
    await setRangeValue(page, 'input[data-s="lightDirectionalIntensity"]', '2.5')
    await setRangeValue(page, 'input[data-s="lightAmbientIntensity"]', '0.1')
    const lightRig = page.locator('input[data-s="lightRigEnabled"]')
    if (!(await lightRig.isChecked())) {
      await lightRig.click()
    }
    await page.waitForFunction(() => {
      const text = document.querySelector<HTMLElement>('#db')?.textContent ?? ''
      const match = text.match(/lights:(\d+)/)
      return match ? Number(match[1]) > 3 : false
    }, {timeout: 15000})
    const litSample = await sampleCanvas(page, '#gc')

    await page.locator('input[data-s="lightRigEnabled"]').click()
    await page.waitForFunction(() => (document.querySelector<HTMLElement>('#db')?.textContent ?? '').includes('lights:0'), {timeout: 15000})
    const unlitSample = await sampleCanvas(page, '#gc')

    assert.equal(litSample.nonWhitePixels > 0, true)
    assert.equal(unlitSample.nonWhitePixels > 0, true)
    assert.equal(averageColorDistance(litSample, unlitSample) > 1, true)
  } finally {
    await browser.close()
    await server.close()
  }
})

test('3d editor route screenshot changes when lighting mode is toggled', async () => {
  const server = await createDistServer()
  const browser = await chromium.launch({headless: true})
  const page = await browser.newPage({viewport: {width: 1280, height: 760}})

  try {
    await page.goto(`${server.url}/index.html#/3dEditor`, {waitUntil: 'domcontentloaded', timeout: 15000})
    await page.waitForSelector('#playground-canvas', {timeout: 15000})
    await page.waitForFunction(() => (document.querySelector<HTMLElement>('#status-line')?.textContent ?? '').includes('lighting lit'), {timeout: 15000})
    const litSample = await sampleCanvas(page, '#playground-canvas')

    await page.locator('button', {hasText: 'Cycle Lighting'}).click()
    await page.waitForFunction(() => (document.querySelector<HTMLElement>('#status-line')?.textContent ?? '').includes('lighting unlit'), {timeout: 15000})
    const unlitSample = await sampleCanvas(page, '#playground-canvas')

    assert.equal(litSample.nonWhitePixels > 0, true)
    assert.equal(unlitSample.nonWhitePixels > 0, true)
    assert.equal(averageColorDistance(litSample, unlitSample) > 1, true)
  } finally {
    await browser.close()
    await server.close()
  }
})