/**
 * Renderer/WebGL resource budget module.
 * Owns GPU buffer/texture budget accounting and eviction bookkeeping.
 * Does not perform draw orchestration or packet planning.
 */
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
  releaseTexture(textureId: string): void
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

const BYTES_PER_KIBIBYTE = 1024
const DEFAULT_MAX_BUFFER_BUDGET_MIB = 32
const DEFAULT_MAX_TEXTURE_BUDGET_MIB = 256
const DEFAULT_MAX_BUFFER_BYTES = DEFAULT_MAX_BUFFER_BUDGET_MIB * BYTES_PER_KIBIBYTE * BYTES_PER_KIBIBYTE
const DEFAULT_MAX_TEXTURE_BYTES = DEFAULT_MAX_TEXTURE_BUDGET_MIB * BYTES_PER_KIBIBYTE * BYTES_PER_KIBIBYTE

/**
 * Handles createEngineWebGLResourceBudgetTracker.
 * @param options Options object for this operation.
 */
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

  const releaseTexture = (textureId: string) => {
    const existing = textureEntries.get(textureId)
    if (!existing) {
      return
    }

    textureEntries.delete(textureId)
    currentTextureBytes = Math.max(0, currentTextureBytes - existing.bytes)
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
    releaseTexture,
    evictLeastRecentlyUsedTextures,
    getTextureBytes,
  }
}

/**
 * Handles sanitizeByteSize.
 * @param value value parameter.
 */
function sanitizeByteSize(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0
  }

  return Math.floor(value)
}
