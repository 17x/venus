// Module responsibility: resolve native WebGPU GPU timing readiness from adapter/device records.
// Non-responsibility: submitting timestamp writes, resolving query sets, or reading GPU buffers.

import type { EngineRenderStats } from '../types/index.ts'
import {
  resolveEngineWebGPUTimestampQueryPlan,
  type EngineWebGPUTimestampQueryPlanState,
} from './webgpuTimestampQueryPlan/webgpuTimestampQueryPlan.ts'

/**
 * Declares GPU timing readiness fields stored in native WebGPU state.
 */
export interface WebGPUNativeGpuTimingState {
  /** True when adapter/device initialization exposed WebGPU timestamp-query support. */
  gpuTimingSupported: boolean
  /** Current GPU timing sample state for native pass diagnostics. */
  gpuTimingSampleState: NonNullable<EngineRenderStats['webgpuGpuTimingSampleState']>
  /** Timestamp-query lifecycle readiness before true resolve/readback instrumentation. */
  gpuTimingQueryPlanState: EngineWebGPUTimestampQueryPlanState
  /** Number of timestamp writes expected by the current lifecycle plan. */
  gpuTimingQueryWriteCount: number
  /** Query-set token used for begin/end timestamp writes when available. */
  gpuTimingQuerySet: unknown | null
  /** Number of timestamp writes emitted during the latest native pass. */
  gpuTimingLastWriteCount: number
  /** Number of timestamp query resolve commands emitted during the latest native pass. */
  gpuTimingLastResolveCount: number
  /** Number of timestamp buffer copy commands emitted during the latest native pass. */
  gpuTimingLastCopyCount: number
  /** Bytes reserved for timestamp readback during the latest native pass. */
  gpuTimingReadbackBufferBytes: number
}

const TIMESTAMP_QUERY_BYTES = 8
const TIMESTAMP_PAIR_BYTES = TIMESTAMP_QUERY_BYTES * 2
const NANOSECONDS_PER_MILLISECOND = 1_000_000

/**
 * Declares parsed WebGPU timestamp readback data.
 */
export interface EngineWebGPUTimestampReadbackResult {
  /** Readback status derived from mapped timestamp data. */
  status: 'unavailable' | 'incomplete' | 'invalid' | 'sampled'
  /** True when timestamp data produced a valid GPU frame duration. */
  available: boolean
  /** First timestamp value in GPU timestamp ticks, when available. */
  beginTimestamp: bigint | null
  /** Second timestamp value in GPU timestamp ticks, when available. */
  endTimestamp: bigint | null
  /** Timestamp period in nanoseconds used to convert ticks to milliseconds. */
  timestampPeriodNanoseconds: number
  /** Parsed GPU frame duration in milliseconds, when available. */
  frameMs: number | null
}

/**
 * Declares inputs for parsing mapped WebGPU timestamp readback buffers.
 */
export interface EngineWebGPUTimestampReadbackInput {
  /** Mapped readback buffer or typed-array view containing at least two u64 timestamps. */
  readback: ArrayBufferLike | ArrayBufferView | null
  /** Timestamp period in nanoseconds per tick reported by the WebGPU implementation. */
  timestampPeriodNanoseconds: number
}

/**
 * Intent: derive native WebGPU timing readiness from adapter feature and device API records.
 * @param adapterRecord Adapter record returned by requestAdapter.
 * @param deviceRecord Device record returned by requestDevice.
 * @returns GPU timing readiness fields for native state.
 */
export function resolveWebGPUNativeGpuTimingState(
  adapterRecord: Record<string, unknown>,
  deviceRecord: Record<string, unknown>,
): WebGPUNativeGpuTimingState {
  const gpuTimingSupported = resolveWebGPUTimestampQuerySupport(adapterRecord)
  const createQuerySet = deviceRecord['createQuerySet']
  const timestampQueryPlan = resolveEngineWebGPUTimestampQueryPlan({
    supported: gpuTimingSupported,
    querySetAvailable: typeof createQuerySet === 'function',
  })
  const querySet = timestampQueryPlan.state === 'ready-unresolved' && typeof createQuerySet === 'function'
    ? createQuerySet.call(deviceRecord, {type: 'timestamp', count: timestampQueryPlan.queryWriteCount})
    : null

  return {
    gpuTimingSupported,
    gpuTimingSampleState: gpuTimingSupported ? 'supported-uninstrumented' : 'unsupported',
    gpuTimingQueryPlanState: timestampQueryPlan.state,
    gpuTimingQueryWriteCount: timestampQueryPlan.queryWriteCount,
    gpuTimingQuerySet: querySet,
    gpuTimingLastWriteCount: 0,
    gpuTimingLastResolveCount: 0,
    gpuTimingLastCopyCount: 0,
    gpuTimingReadbackBufferBytes: 0,
  }
}

/**
 * Intent: emit one native WebGPU timestamp write when lifecycle readiness allows it.
 * @param state Native GPU timing state for the current renderer.
 * @param encoderRecord Command encoder record that may expose writeTimestamp.
 * @param queryIndex Query index to write.
 */
export function applyWebGPUTimestampWrite(
  state: WebGPUNativeGpuTimingState,
  encoderRecord: Record<string, unknown>,
  queryIndex: number,
): void {
  const writeTimestamp = encoderRecord['writeTimestamp']
  if (state.gpuTimingQueryPlanState !== 'ready-unresolved' || !state.gpuTimingQuerySet || typeof writeTimestamp !== 'function') {
    return
  }

  writeTimestamp.call(encoderRecord, state.gpuTimingQuerySet, queryIndex)
  state.gpuTimingLastWriteCount += 1
}

/**
 * Intent: encode timestamp query resolve/copy commands needed before future CPU readback.
 * @param state Native GPU timing state for the current renderer.
 * @param deviceRecord Device record that may expose createBuffer.
 * @param encoderRecord Command encoder record that may expose resolve/copy commands.
 */
export function applyWebGPUTimestampResolve(
  state: WebGPUNativeGpuTimingState,
  deviceRecord: Record<string, unknown>,
  encoderRecord: Record<string, unknown>,
): void {
  state.gpuTimingLastResolveCount = 0
  state.gpuTimingLastCopyCount = 0
  state.gpuTimingReadbackBufferBytes = 0
  const createBuffer = deviceRecord['createBuffer']
  const resolveQuerySet = encoderRecord['resolveQuerySet']
  const copyBufferToBuffer = encoderRecord['copyBufferToBuffer']
  if (
    state.gpuTimingQueryPlanState !== 'ready-unresolved'
    || !state.gpuTimingQuerySet
    || state.gpuTimingLastWriteCount < state.gpuTimingQueryWriteCount
    || typeof createBuffer !== 'function'
    || typeof resolveQuerySet !== 'function'
    || typeof copyBufferToBuffer !== 'function'
  ) {
    return
  }

  const byteLength = state.gpuTimingQueryWriteCount * TIMESTAMP_QUERY_BYTES
  const resolveBuffer = createBuffer.call(deviceRecord, {size: byteLength, usage: 0})
  const readbackBuffer = createBuffer.call(deviceRecord, {size: byteLength, usage: 0})
  resolveQuerySet.call(encoderRecord, state.gpuTimingQuerySet, 0, state.gpuTimingQueryWriteCount, resolveBuffer, 0)
  copyBufferToBuffer.call(encoderRecord, resolveBuffer, 0, readbackBuffer, 0, byteLength)
  state.gpuTimingLastResolveCount = 1
  state.gpuTimingLastCopyCount = 1
  state.gpuTimingReadbackBufferBytes = byteLength
}

/**
 * Intent: parse mapped WebGPU timestamp data into a GPU frame duration without touching renderer state.
 * @param input Mapped readback payload and timestamp period.
 * @returns Parsed timestamp readback result.
 */
export function resolveWebGPUTimestampReadback(
  input: EngineWebGPUTimestampReadbackInput,
): EngineWebGPUTimestampReadbackResult {
  const timestampPeriodNanoseconds = Math.max(0, input.timestampPeriodNanoseconds)
  if (!input.readback) {
    return createTimestampReadbackResult('unavailable', null, null, timestampPeriodNanoseconds)
  }

  const view = resolveTimestampReadbackView(input.readback)
  if (view.byteLength < TIMESTAMP_PAIR_BYTES) {
    return createTimestampReadbackResult('incomplete', null, null, timestampPeriodNanoseconds)
  }

  const beginTimestamp = view.getBigUint64(0, true)
  const endTimestamp = view.getBigUint64(TIMESTAMP_QUERY_BYTES, true)
  if (endTimestamp < beginTimestamp) {
    return createTimestampReadbackResult('invalid', beginTimestamp, endTimestamp, timestampPeriodNanoseconds)
  }

  return createTimestampReadbackResult('sampled', beginTimestamp, endTimestamp, timestampPeriodNanoseconds)
}

/**
 * Intent: normalize mapped timestamp buffers and typed-array views into a DataView.
 * @param readback Mapped readback payload.
 * @returns DataView over the timestamp payload.
 */
function resolveTimestampReadbackView(readback: ArrayBufferLike | ArrayBufferView): DataView {
  if (ArrayBuffer.isView(readback)) {
    return new DataView(readback.buffer, readback.byteOffset, readback.byteLength)
  }

  return new DataView(readback)
}

/**
 * Intent: create one timestamp readback parser result with duration computed only for valid samples.
 * @param status Parser status.
 * @param beginTimestamp First timestamp, when parsed.
 * @param endTimestamp Second timestamp, when parsed.
 * @param timestampPeriodNanoseconds Timestamp period used for conversion.
 * @returns Timestamp readback parser result.
 */
function createTimestampReadbackResult(
  status: EngineWebGPUTimestampReadbackResult['status'],
  beginTimestamp: bigint | null,
  endTimestamp: bigint | null,
  timestampPeriodNanoseconds: number,
): EngineWebGPUTimestampReadbackResult {
  const durationTicks = status === 'sampled' && beginTimestamp !== null && endTimestamp !== null
    ? endTimestamp - beginTimestamp
    : null
  return {
    status,
    available: status === 'sampled',
    beginTimestamp,
    endTimestamp,
    timestampPeriodNanoseconds,
    frameMs: durationTicks === null
      ? null
      : Number(durationTicks) * timestampPeriodNanoseconds / NANOSECONDS_PER_MILLISECOND,
  }
}

/**
 * Intent: resolve whether the WebGPU adapter reports timestamp-query support.
 * @param adapterRecord Adapter record returned by requestAdapter.
 * @returns True when timestamp-query support is advertised.
 */
export function resolveWebGPUTimestampQuerySupport(adapterRecord: Record<string, unknown>): boolean {
  const features = adapterRecord['features']
  if (!features || typeof features !== 'object') {
    return false
  }

  const featureSet = features as {has?: (featureName: string) => boolean}
  return featureSet.has?.('timestamp-query') === true
}
