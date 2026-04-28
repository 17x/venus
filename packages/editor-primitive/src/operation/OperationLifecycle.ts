import type {Point2D} from '@venus/lib'
import type {ActiveOperation} from './ActiveOperation.ts'
import {createActiveOperation} from './ActiveOperation.ts'

/**
 * Defines operation lifecycle manager API.
 */
export interface OperationLifecycleManager<
  TType extends string,
  TPayload = unknown,
> {
  /** Starts a new active operation and replaces any previous one. */
  begin: (input: {
    id: string
    type: TType
    startedAt: number
    screen: Point2D
    world?: Point2D
    pointerId?: number
    payload?: TPayload
  }) => ActiveOperation<TType, TPayload>
  /** Updates current operation pointer and delta fields. */
  update: (screen: Point2D, world?: Point2D) => ActiveOperation<TType, TPayload> | null
  /** Ends and returns current operation snapshot. */
  commit: () => ActiveOperation<TType, TPayload> | null
  /** Cancels current operation without returning payload. */
  cancel: () => void
  /** Returns current operation snapshot. */
  getCurrent: () => ActiveOperation<TType, TPayload> | null
}

/**
 * Creates operation lifecycle manager with in-memory active operation storage.
 */
export function createOperationLifecycleManager<
  TType extends string,
  TPayload = unknown,
>(): OperationLifecycleManager<TType, TPayload> {
  let currentOperation: ActiveOperation<TType, TPayload> | null = null

  /**
   * Starts a fresh active operation and replaces existing operation state.
   */
  const begin: OperationLifecycleManager<TType, TPayload>['begin'] = (input) => {
    currentOperation = createActiveOperation<TType, TPayload>({
      id: input.id,
      type: input.type,
      startedAt: input.startedAt,
      startScreen: input.screen,
      startWorld: input.world,
      pointerId: input.pointerId,
      payload: input.payload,
    })
    return currentOperation
  }

  /**
   * Updates pointer position and recomputes deltas for active operation.
   */
  const update: OperationLifecycleManager<TType, TPayload>['update'] = (screen, world) => {
    if (!currentOperation) {
      return null
    }

    currentOperation = {
      ...currentOperation,
      currentScreen: screen,
      deltaScreen: {
        x: screen.x - currentOperation.startScreen.x,
        y: screen.y - currentOperation.startScreen.y,
      },
      currentWorld: world,
      // Preserve undefined world deltas when world projection is unavailable.
      deltaWorld:
        world && currentOperation.startWorld
          ? {
            x: world.x - currentOperation.startWorld.x,
            y: world.y - currentOperation.startWorld.y,
          }
          : undefined,
    }

    return currentOperation
  }

  /**
   * Commits and clears active operation state.
   */
  const commit: OperationLifecycleManager<TType, TPayload>['commit'] = () => {
    const operation = currentOperation
    currentOperation = null
    return operation
  }

  /**
   * Cancels active operation and drops its state.
   */
  const cancel: OperationLifecycleManager<TType, TPayload>['cancel'] = () => {
    currentOperation = null
  }

  /**
   * Returns the in-memory active operation snapshot.
   */
  const getCurrent: OperationLifecycleManager<TType, TPayload>['getCurrent'] = () => currentOperation

  return {
    begin,
    update,
    commit,
    cancel,
    getCurrent,
  }
}

