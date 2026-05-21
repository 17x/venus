import assert from 'node:assert/strict'
import test from 'node:test'

import {
  resolveWebGPUTimestampReadback,
} from './webgpuNativeTiming.ts'

/**
 * Verifies missing mapped data reports unavailable without producing a frame duration.
 */
test('resolveWebGPUTimestampReadback reports unavailable data', () => {
  const result = resolveWebGPUTimestampReadback({
    readback: null,
    timestampPeriodNanoseconds: 1,
  })

  assert.equal(result.status, 'unavailable')
  assert.equal(result.available, false)
  assert.equal(result.frameMs, null)
})

/**
 * Verifies short mapped buffers report incomplete timestamp data.
 */
test('resolveWebGPUTimestampReadback reports incomplete data', () => {
  const result = resolveWebGPUTimestampReadback({
    readback: new ArrayBuffer(8),
    timestampPeriodNanoseconds: 1,
  })

  assert.equal(result.status, 'incomplete')
  assert.equal(result.frameMs, null)
})

/**
 * Verifies reversed timestamp pairs are rejected as invalid samples.
 */
test('resolveWebGPUTimestampReadback rejects reversed timestamp pairs', () => {
  const buffer = createTimestampBuffer(200n, 100n)
  const result = resolveWebGPUTimestampReadback({
    readback: buffer,
    timestampPeriodNanoseconds: 1,
  })

  assert.equal(result.status, 'invalid')
  assert.equal(result.beginTimestamp, 200n)
  assert.equal(result.endTimestamp, 100n)
  assert.equal(result.frameMs, null)
})

/**
 * Verifies valid u64 timestamp pairs convert to milliseconds using timestamp period.
 */
test('resolveWebGPUTimestampReadback converts valid timestamp pairs', () => {
  const result = resolveWebGPUTimestampReadback({
    readback: new Uint8Array(createTimestampBuffer(100n, 600n)),
    timestampPeriodNanoseconds: 2,
  })

  assert.equal(result.status, 'sampled')
  assert.equal(result.available, true)
  assert.equal(result.beginTimestamp, 100n)
  assert.equal(result.endTimestamp, 600n)
  assert.equal(result.frameMs, 0.001)
})

/**
 * Intent: create a little-endian two-u64 timestamp readback fixture.
 * @param beginTimestamp First timestamp value.
 * @param endTimestamp Second timestamp value.
 * @returns ArrayBuffer containing two u64 timestamp values.
 */
function createTimestampBuffer(beginTimestamp: bigint, endTimestamp: bigint): ArrayBuffer {
  const buffer = new ArrayBuffer(16)
  const view = new DataView(buffer)
  view.setBigUint64(0, beginTimestamp, true)
  view.setBigUint64(8, endTimestamp, true)
  return buffer
}
