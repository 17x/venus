export interface EngineWebGLBudgetState {
  frameId: number
  bufferBytes: number
  textureBytes: number
  overBufferBudget: boolean
  overTextureBudget: boolean
  bufferOverflowBytes: number
  textureOverflowBytes: number
}

export interface EngineWebGLResourceBudgetTracker {
  recordFrameUsage(usage: {bufferBytes: number; textureBytes: number}): EngineWebGLBudgetState
  markTextureResident(textureId: string, bytes: number): void
  markTextureUsed(textureId: string): void
  evictLeastRecentlyUsedTextures(targetBytes: number): string[]
  getTextureBytes(): number
}

interface EngineWebGLResourceBudgetOptions {
  maxBufferBytes?: number
  maxTextureBytes?: number
}

interface TextureEntry {
  bytes: number
  lastUsedFrame: number
}

const DEFAULT_MAX_BUFFER_BYTES = 32 * 1024 * 1024
const DEFAULT_MAX_TEXTURE_BYTES = 256 * 1024 * 1024

export function createEngineWebGLResourceBudgetTracker(
  options: EngineWebGLResourceBudgetOptions = {},
): EngineWebGLResourceBudgetTracker {
  const maxBufferBytes = options.maxBufferBytes ?? DEFAULT_MAX_BUFFER_BYTES
  const maxTextureBytes = options.maxTextureBytes ?? DEFAULT_MAX_TEXTURE_BYTES

  let frameId = 0
  let currentBufferBytes = 0
  let currentTextureBytes = 0
  const textureEntries = new Map<string, TextureEntry>()

  const recordFrameUsage = (usage: {bufferBytes: number; textureBytes: number}) => {
    frameId += 1
    currentBufferBytes = sanitizeByteSize(usage.bufferBytes)
    currentTextureBytes = Math.max(currentTextureBytes, sanitizeByteSize(usage.textureBytes))

    return {
      frameId,
      bufferBytes: currentBufferBytes,
      textureBytes: currentTextureBytes,
      overBufferBudget: currentBufferBytes > maxBufferBytes,
      overTextureBudget: currentTextureBytes > maxTextureBytes,
      bufferOverflowBytes: Math.max(0, currentBufferBytes - maxBufferBytes),
      textureOverflowBytes: Math.max(0, currentTextureBytes - maxTextureBytes),
    }
  }

  const markTextureResident = (textureId: string, bytes: number) => {
    const nextBytes = sanitizeByteSize(bytes)
    const existing = textureEntries.get(textureId)
    if (existing) {
      currentTextureBytes = Math.max(0, currentTextureBytes - existing.bytes)
    }

    textureEntries.set(textureId, {
      bytes: nextBytes,
      lastUsedFrame: frameId,
    })
    currentTextureBytes += nextBytes
  }

  const markTextureUsed = (textureId: string) => {
    const existing = textureEntries.get(textureId)
    if (!existing) {
      return
    }

    existing.lastUsedFrame = frameId
  }

  const evictLeastRecentlyUsedTextures = (targetBytes: number) => {
    const bytesToFree = sanitizeByteSize(targetBytes)
    if (bytesToFree <= 0 || textureEntries.size === 0) {
      return []
    }

    const ordered = Array.from(textureEntries.entries())
      .sort((left, right) => left[1].lastUsedFrame - right[1].lastUsedFrame)

    let freedBytes = 0
    const evicted: string[] = []

    for (const [textureId, entry] of ordered) {
      textureEntries.delete(textureId)
      currentTextureBytes = Math.max(0, currentTextureBytes - entry.bytes)
      freedBytes += entry.bytes
      evicted.push(textureId)

      if (freedBytes >= bytesToFree) {
        break
      }
    }

    return evicted
  }

  const getTextureBytes = () => currentTextureBytes

  return {
    recordFrameUsage,
    markTextureResident,
    markTextureUsed,
    evictLeastRecentlyUsedTextures,
    getTextureBytes,
  }
}

function sanitizeByteSize(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0
  }

  return Math.floor(value)
}
