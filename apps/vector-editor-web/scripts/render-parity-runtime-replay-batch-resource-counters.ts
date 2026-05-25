/**
 * Declares runtime resource decode-status distribution counters for one replay input.
 */
export interface RenderParityRuntimeResourceDecodeStatusCounter {
  /** Stores diagnostics row count with queued decode status. */
  queued: number
  /** Stores diagnostics row count with decoding decode status. */
  decoding: number
  /** Stores diagnostics row count with ready decode status. */
  ready: number
  /** Stores diagnostics row count with failed decode status. */
  failed: number
  /** Stores diagnostics row count without known decode status token. */
  unknown: number
}

/**
 * Declares runtime resource compression-codec distribution counters for one replay input.
 */
export interface RenderParityRuntimeResourceCompressionCodecCounter {
  /** Stores diagnostics row count with explicit uncompressed/none codec token. */
  none: number
  /** Stores diagnostics row count with Brotli codec token. */
  brotli: number
  /** Stores diagnostics row count with Gzip codec token. */
  gzip: number
  /** Stores diagnostics row count with Zstd codec token. */
  zstd: number
  /** Stores diagnostics row count with Lz4 codec token. */
  lz4: number
  /** Stores diagnostics row count without known compression codec token. */
  unknown: number
}

/**
 * Declares runtime resource counter set resolved from one diagnostics payload.
 */
export interface RenderParityRuntimeResourceCounterSet {
  /** Stores decode-status distribution for one diagnostics input. */
  decodeStatusCounter: RenderParityRuntimeResourceDecodeStatusCounter
  /** Stores compression-codec distribution for one diagnostics input. */
  compressionCodecCounter: RenderParityRuntimeResourceCompressionCodecCounter
}

/**
 * Builds runtime resource counters from diagnostics records.
 * @param records Runtime diagnostics records for one input file.
 */
export function createRuntimeResourceCounterSetFromRecords(
  records: readonly unknown[],
): RenderParityRuntimeResourceCounterSet {
  const decodeStatusCounter: RenderParityRuntimeResourceDecodeStatusCounter = {
    queued: 0,
    decoding: 0,
    ready: 0,
    failed: 0,
    unknown: 0,
  }
  const compressionCodecCounter: RenderParityRuntimeResourceCompressionCodecCounter = {
    none: 0,
    brotli: 0,
    gzip: 0,
    zstd: 0,
    lz4: 0,
    unknown: 0,
  }

  for (const row of records) {
    const record = (row && typeof row === 'object')
      ? (row as {
          runtimeResourceDecodeStatus?: unknown
          runtimeResourceCompressionCodec?: unknown
          resourceDecodeStatus?: unknown
          resourceCompressionCodec?: unknown
        })
      : null

    // Accept both runtimeResource* and resource* aliases so replay assets can evolve without brittle breakage.
    const decodeStatusTokenRaw =
      typeof record?.runtimeResourceDecodeStatus === 'string'
        ? record.runtimeResourceDecodeStatus
        : typeof record?.resourceDecodeStatus === 'string'
          ? record.resourceDecodeStatus
          : ''
    const decodeStatus = decodeStatusTokenRaw.trim().toLowerCase()
    if (decodeStatus === 'queued') {
      decodeStatusCounter.queued += 1
    } else if (decodeStatus === 'decoding') {
      decodeStatusCounter.decoding += 1
    } else if (decodeStatus === 'ready') {
      decodeStatusCounter.ready += 1
    } else if (decodeStatus === 'failed') {
      decodeStatusCounter.failed += 1
    } else {
      decodeStatusCounter.unknown += 1
    }

    const compressionCodecTokenRaw =
      typeof record?.runtimeResourceCompressionCodec === 'string'
        ? record.runtimeResourceCompressionCodec
        : typeof record?.resourceCompressionCodec === 'string'
          ? record.resourceCompressionCodec
          : ''
    const compressionCodec = compressionCodecTokenRaw.trim().toLowerCase()
    if (compressionCodec === 'none' || compressionCodec === 'uncompressed') {
      compressionCodecCounter.none += 1
    } else if (compressionCodec === 'brotli' || compressionCodec === 'br') {
      compressionCodecCounter.brotli += 1
    } else if (compressionCodec === 'gzip' || compressionCodec === 'gz') {
      compressionCodecCounter.gzip += 1
    } else if (compressionCodec === 'zstd') {
      compressionCodecCounter.zstd += 1
    } else if (compressionCodec === 'lz4') {
      compressionCodecCounter.lz4 += 1
    } else {
      compressionCodecCounter.unknown += 1
    }
  }

  return {
    decodeStatusCounter,
    compressionCodecCounter,
  }
}

/**
 * Builds aggregate runtime resource decode-status distribution from per-row counters.
 * @param counters Per-row runtime resource decode-status counters.
 */
export function createRuntimeResourceDecodeStatusAggregateCounter(
  counters: readonly RenderParityRuntimeResourceDecodeStatusCounter[],
): RenderParityRuntimeResourceDecodeStatusCounter {
  const aggregate: RenderParityRuntimeResourceDecodeStatusCounter = {
    queued: 0,
    decoding: 0,
    ready: 0,
    failed: 0,
    unknown: 0,
  }

  for (const counter of counters) {
    aggregate.queued += counter.queued
    aggregate.decoding += counter.decoding
    aggregate.ready += counter.ready
    aggregate.failed += counter.failed
    aggregate.unknown += counter.unknown
  }

  return aggregate
}

/**
 * Builds aggregate runtime resource compression-codec distribution from per-row counters.
 * @param counters Per-row runtime resource compression-codec counters.
 */
export function createRuntimeResourceCompressionCodecAggregateCounter(
  counters: readonly RenderParityRuntimeResourceCompressionCodecCounter[],
): RenderParityRuntimeResourceCompressionCodecCounter {
  const aggregate: RenderParityRuntimeResourceCompressionCodecCounter = {
    none: 0,
    brotli: 0,
    gzip: 0,
    zstd: 0,
    lz4: 0,
    unknown: 0,
  }

  for (const counter of counters) {
    aggregate.none += counter.none
    aggregate.brotli += counter.brotli
    aggregate.gzip += counter.gzip
    aggregate.zstd += counter.zstd
    aggregate.lz4 += counter.lz4
    aggregate.unknown += counter.unknown
  }

  return aggregate
}
