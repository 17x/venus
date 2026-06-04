import assert from 'node:assert/strict'
import test from 'node:test'

import {syncImageRegistry} from './imageRegistrySync.ts'

function createFakeImage() {
  let src: string | null = null
  return {
    complete: false,
    naturalWidth: 0,
    onload: null as null | (() => void),
    onerror: null as null | (() => void),
    getAttribute: (name: string) => name === 'src' ? src : null,
    setAttribute: (name: string, value: string) => {
      if (name === 'src') {
        src = value
      }
    },
  } as unknown as HTMLImageElement
}

test('syncImageRegistry loads missing images and redraws after load', () => {
  const cache = new Map<string, HTMLImageElement>()
  const registrySnapshots: string[][] = []
  let renderCount = 0

  syncImageRegistry({
    assetUrls: new Map([['asset-a', 'data:image/png;base64,a']]),
    imageCache: cache,
    engine: {
      setImageRegistry: (images) => registrySnapshots.push([...images.keys()]),
    },
    createImage: createFakeImage,
    requestRender: () => {
      renderCount += 1
    },
  })

  assert.deepEqual([...cache.keys()], ['asset-a'])
  assert.deepEqual(registrySnapshots, [['asset-a']])
  cache.get('asset-a')?.onload?.(new Event('load'))
  assert.equal(renderCount, 1)
  assert.deepEqual(registrySnapshots[registrySnapshots.length - 1], ['asset-a'])
})

test('syncImageRegistry replaces stale URLs and removes failed images', () => {
  const staleImage = createFakeImage()
  staleImage.setAttribute('src', 'blob:stale')
  const cache = new Map<string, HTMLImageElement>([['asset-a', staleImage]])
  let renderCount = 0

  syncImageRegistry({
    assetUrls: new Map([['asset-a', 'data:image/png;base64,new']]),
    imageCache: cache,
    engine: null,
    createImage: createFakeImage,
    requestRender: () => {
      renderCount += 1
    },
  })

  assert.notEqual(cache.get('asset-a'), staleImage)
  assert.equal(cache.get('asset-a')?.getAttribute('src'), 'data:image/png;base64,new')
  cache.get('asset-a')?.onerror?.(new Event('error'))
  assert.equal(cache.has('asset-a'), false)
  assert.equal(renderCount, 1)
})
