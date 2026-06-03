import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import test from 'node:test'
import zlib from 'node:zlib'
import {chromium, type BrowserContext, type Page} from 'playwright'

import {REMOTE_SCENARIO_DEFINITIONS, type RemoteScenarioDefinition} from '../demos/remoteScenarioCatalog'

const distDir = path.resolve(process.cwd(), 'dist')

const csvFixture = [
  'iata,name,longitude,latitude,elo_n,pts,opp_pts,GDP (BILLIONS),temp_max,temp_min,symbol,date,price',
  'AAA,Alpha,-122.4,37.7,1500,112,104,1100,21,12,A,2024-01-01,42',
  'BBB,Beta,-73.9,40.7,1650,98,91,780,24,14,A,2024-01-02,48',
  'CCC,Gamma,-0.1,51.5,1430,121,118,420,18,9,B,2024-01-01,31',
  'DDD,Delta,139.7,35.6,1710,105,99,1450,26,15,B,2024-01-02,37',
].join('\n')

const geoJsonFixture = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {mag: 4.1, depth: 12},
      geometry: {type: 'Point', coordinates: [-122.4, 37.7, 12]},
    },
    {
      type: 'Feature',
      properties: {mag: 2.7, depth: 38},
      geometry: {type: 'Point', coordinates: [-73.9, 40.7, 38]},
    },
    {
      type: 'Feature',
      properties: {},
      geometry: {type: 'Polygon', coordinates: [[[-123, 49], [-122.8, 49], [-122.8, 49.2], [-123, 49.2], [-123, 49]]]},
    },
  ],
}

const graphJsonFixture = {
  nodes: [
    {name: 'alpha', group: 1, index: 0},
    {name: 'beta', group: 2, index: 1},
    {name: 'gamma', group: 3, index: 2},
  ],
  links: [
    {source: 0, target: 1, value: 1},
    {source: 1, target: 2, value: 2},
  ],
}

const jsonArrayFixture = [
  {Name: 'Fixture Car', Horsepower: 120, Weight_in_lbs: 2300, series: 'manufacturing', count: 120, rate: 4.5, date: '2024-01-01', title: 'Fixture Product', price: 42, rating: {rate: 4.4, count: 120}},
  {Name: 'Fixture Truck', Horsepower: 180, Weight_in_lbs: 3100, series: 'services', count: 220, rate: 5.2, date: '2024-02-01', title: 'Second Product', price: 72, rating: {rate: 3.8, count: 64}},
]

const resolveContentType = (filePath: string): string => {
  const extension = path.extname(filePath)
  if (extension === '.html') return 'text/html; charset=utf-8'
  if (extension === '.js') return 'text/javascript; charset=utf-8'
  if (extension === '.css') return 'text/css; charset=utf-8'
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

const sampleCanvas = async (page: Page, selector: string): Promise<{nonWhitePixels: number; uniqueColors: number}> => {
  const png = await page.locator(selector).screenshot()
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
  }
  return {nonWhitePixels, uniqueColors: colors.size}
}

const fixturePayloadForScenario = (scenario: RemoteScenarioDefinition): string => {
  if (scenario.datasetFormat === 'csv') {
    return csvFixture
  }
  if (
    scenario.id === 's3-bim-collab-review'
    || scenario.id === 's5-gis-live-map-streaming'
    || scenario.id === 's9-molecular-volume-exploration'
  ) {
    return JSON.stringify(geoJsonFixture)
  }
  if (scenario.id === 's10-game-editor-runtime-preview') {
    return JSON.stringify(graphJsonFixture)
  }
  return JSON.stringify(jsonArrayFixture)
}

const installDatasetRouteMocks = async (context: BrowserContext): Promise<void> => {
  for (const scenario of REMOTE_SCENARIO_DEFINITIONS) {
    await context.route(scenario.datasetUrl, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: scenario.datasetFormat === 'json' ? 'application/json' : 'text/csv',
        body: fixturePayloadForScenario(scenario),
      })
    })
  }
}

test('all remote scenario routes render nonblank canvas and expose node/draw status', async () => {
  const server = await createDistServer()
  const browser = await chromium.launch({headless: true})
  const context = await browser.newContext({viewport: {width: 1280, height: 760}})
  await installDatasetRouteMocks(context)

  try {
    for (const scenario of REMOTE_SCENARIO_DEFINITIONS) {
      const page = await context.newPage()
      await page.goto(`${server.url}/index.html#${scenario.path}`, {waitUntil: 'domcontentloaded', timeout: 15000})
      await page.waitForSelector('#remote-canvas', {timeout: 15000})
      await page.waitForFunction(() => {
        const status = document.querySelector<HTMLElement>('#remote-status')
        if (!status) return false
        const text = status.textContent ?? ''
        const nodes = Number(text.match(/nodes (\d+)/)?.[1] ?? 0)
        const draw = Number(text.match(/draw (\d+)/)?.[1] ?? 0)
        return nodes > 2 && draw > 0 && text.includes('webglPath')
      }, {timeout: 15000})

      const sample = await sampleCanvas(page, '#remote-canvas')
      assert.equal(sample.nonWhitePixels > 0, true, `${scenario.id} should render nonwhite pixels`)
      assert.equal(sample.uniqueColors > 1, true, `${scenario.id} should render multiple colors`)
      const beforeStatus = await page.locator('#remote-status').textContent()
      const beforeStep = Number(beforeStatus?.match(/previewStep (\d+)/)?.[1] ?? 0)
      const runtimeStepButton = page.locator('#remote-interactions button', {hasText: 'runtime preview step'})
      const interactionButton = await runtimeStepButton.count() > 0
        ? runtimeStepButton.first()
        : page.locator('#remote-interactions button').first()
      await interactionButton.click()
      await page.waitForFunction((previousStatus) => {
        const status = document.querySelector<HTMLElement>('#remote-status')
        if (!status) return false
        const text = status.textContent ?? ''
        return text !== previousStatus
          && Number(text.match(/previewStep (\d+)/)?.[1] ?? 0) > 0
      }, beforeStatus, {timeout: 15000})
      const afterStatus = await page.locator('#remote-status').textContent()
      const afterStep = Number(afterStatus?.match(/previewStep (\d+)/)?.[1] ?? 0)
      assert.equal(afterStep > beforeStep, true, `${scenario.id} interaction should advance deterministic state`)
      if (scenario.id !== 's10-game-editor-runtime-preview') {
        assert.equal(afterStatus?.includes('selected none'), false, `${scenario.id} interaction should expose selection diagnostics`)
      }
      const afterSample = await sampleCanvas(page, '#remote-canvas')
      assert.equal(afterSample.nonWhitePixels > 0, true, `${scenario.id} should remain nonblank after interaction`)
      await page.close()
    }
  } finally {
    await browser.close()
    await server.close()
  }
})
