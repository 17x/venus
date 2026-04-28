import type {Point2D} from '@venus/lib'

/**
 * Describes one active interaction operation lifecycle payload.
 */
export interface ActiveOperation<
  TType extends string = string,
  TPayload = unknown,
> {
  /** Stores stable operation instance id. */
  id: string
  /** Stores operation type identifier. */
  type: TType
  /** Stores operation start timestamp. */
  startedAt: number
  /** Stores screen-space pointer at operation start. */
  startScreen: Point2D
  /** Stores latest screen-space pointer. */
  currentScreen: Point2D
  /** Stores screen-space pointer delta from start. */
  deltaScreen: Point2D
  /** Stores world-space pointer at operation start when available. */
  startWorld?: Point2D
  /** Stores latest world-space pointer when available. */
  currentWorld?: Point2D
  /** Stores world-space pointer delta from start when available. */
  deltaWorld?: Point2D
  /** Stores active pointer id when operation is pointer-bound. */
  pointerId?: number
  /** Stores product-defined operation payload. */
  payload?: TPayload
}

/**
 * Creates initial active operation from start-point data.
 */
export function createActiveOperation<TType extends string, TPayload = unknown>(input: {
  /** Stores unique operation id. */
  id: string
  /** Stores operation type. */
  type: TType
  /** Stores operation start timestamp. */
  startedAt: number
  /** Stores operation start pointer in screen space. */
  startScreen: Point2D
  /** Stores optional operation start pointer in world space. */
  startWorld?: Point2D
  /** Stores optional bound pointer id. */
  pointerId?: number
  /** Stores optional operation payload. */
  payload?: TPayload
}): ActiveOperation<TType, TPayload> {
  return {
    id: input.id,
    type: input.type,
    startedAt: input.startedAt,
    startScreen: input.startScreen,
    currentScreen: input.startScreen,
    deltaScreen: {x: 0, y: 0},
    startWorld: input.startWorld,
    currentWorld: input.startWorld,
    deltaWorld: input.startWorld ? {x: 0, y: 0} : undefined,
    pointerId: input.pointerId,
    payload: input.payload,
  }
}

