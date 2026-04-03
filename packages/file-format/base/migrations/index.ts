import { v1_to_v2 } from './v1_to_v2.ts'
import { v2_to_v3 } from './v2_to_v3.ts'
import { v3_to_v4 } from './v3_to_v4.ts'
import { v4_to_v5 } from './v4_to_v5.ts'
import type { RuntimeSceneAny, RuntimeSceneLatest } from './types.ts'

export const LATEST_SCHEMA_VERSION = 5 as const

export function upgradeSceneToLatest(scene: RuntimeSceneAny): RuntimeSceneLatest {
  let current = scene as RuntimeSceneAny

  while (current.version < LATEST_SCHEMA_VERSION) {
    if (current.version === 1) {
      current = v1_to_v2(current)
      continue
    }

    if (current.version === 2) {
      current = v2_to_v3(current)
      continue
    }

    if (current.version === 3) {
      current = v3_to_v4(current)
      continue
    }

    if (current.version === 4) {
      current = v4_to_v5(current)
      continue
    }

    throw new Error(`Unsupported schema version transition from ${String(current.version)}`)
  }

  if (current.version !== LATEST_SCHEMA_VERSION) {
    throw new Error(`Unsupported schema version ${String(current.version)}`)
  }

  return current
}
