export interface SharedHitTestViews {
  meta: Int32Array
}

/**
 * Shared layout for one hit-test request/response slot.
 *
 * meta[Int32]:
 * 0 requestToken
 * 1 responseToken
 * 2 status (0 pending, 1 hit, 2 miss)
 * 3 hitIndex
 * 4 pointX * 1000
 * 5 pointY * 1000
 * 6 tolerance * 1000
 * 7 reserved
 */
const SHARED_HIT_TEST_META_LENGTH = 8
const SCALE = 1000

const enum MetaIndex {
  RequestToken = 0,
  ResponseToken = 1,
  Status = 2,
  HitIndex = 3,
  PointX = 4,
  PointY = 5,
  Tolerance = 6,
}

const enum HitStatus {
  Pending = 0,
  Hit = 1,
  Miss = 2,
}

export function createSharedHitTestBuffer() {
  return new SharedArrayBuffer(
    SHARED_HIT_TEST_META_LENGTH * Int32Array.BYTES_PER_ELEMENT,
  )
}

export function attachSharedHitTestViews(buffer: SharedArrayBuffer): SharedHitTestViews {
  return {
    meta: new Int32Array(buffer, 0, SHARED_HIT_TEST_META_LENGTH),
  }
}

export function writeSharedHitTestRequest(
  views: SharedHitTestViews,
  requestToken: number,
  x: number,
  y: number,
  tolerance: number,
) {
  Atomics.store(views.meta, MetaIndex.PointX, Math.round(x * SCALE))
  Atomics.store(views.meta, MetaIndex.PointY, Math.round(y * SCALE))
  Atomics.store(views.meta, MetaIndex.Tolerance, Math.round(tolerance * SCALE))
  Atomics.store(views.meta, MetaIndex.Status, HitStatus.Pending)
  Atomics.store(views.meta, MetaIndex.RequestToken, requestToken)
}

export function readSharedHitTestRequest(views: SharedHitTestViews) {
  return {
    requestToken: Atomics.load(views.meta, MetaIndex.RequestToken),
    point: {
      x: Atomics.load(views.meta, MetaIndex.PointX) / SCALE,
      y: Atomics.load(views.meta, MetaIndex.PointY) / SCALE,
    },
    tolerance: Atomics.load(views.meta, MetaIndex.Tolerance) / SCALE,
  }
}

export function writeSharedHitTestResponse(
  views: SharedHitTestViews,
  requestToken: number,
  hitIndex: number,
) {
  if (hitIndex >= 0) {
    Atomics.store(views.meta, MetaIndex.HitIndex, hitIndex)
    Atomics.store(views.meta, MetaIndex.Status, HitStatus.Hit)
  } else {
    Atomics.store(views.meta, MetaIndex.HitIndex, -1)
    Atomics.store(views.meta, MetaIndex.Status, HitStatus.Miss)
  }

  Atomics.store(views.meta, MetaIndex.ResponseToken, requestToken)
}

export function readSharedHitTestResponse(views: SharedHitTestViews) {
  return {
    responseToken: Atomics.load(views.meta, MetaIndex.ResponseToken),
    status: Atomics.load(views.meta, MetaIndex.Status),
    hitIndex: Atomics.load(views.meta, MetaIndex.HitIndex),
  }
}

export function isSharedHit(views: SharedHitTestViews) {
  return Atomics.load(views.meta, MetaIndex.Status) === HitStatus.Hit
}
