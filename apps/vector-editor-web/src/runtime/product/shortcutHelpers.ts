import type {ToolName} from '../../runtime/model/index.ts'
import SHORTCUTS_DATA, {type ActionItemType} from '../actions.ts'
import typeCheck from '../typeCheck.ts'

type DeepCloneOptions = { clonePrototype?: boolean }

/** Deep-clones an object tree. Used by shortcut action builder. */
function deepClone<T>(obj: T, options: DeepCloneOptions = {}): T {
  if (typeof obj !== 'object' || obj === null) return obj
  if (Array.isArray(obj)) return obj.map((item) => deepClone(item, options)) as T
  const clone = Object.create(options.clonePrototype ? Object.getPrototypeOf(obj) : null)
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) clone[key] = deepClone(obj[key], options)
  }
  return clone
}

type Obj = { [key: string]: any; children?: Obj[] }

/** Recursively finds objects matching a predicate in a tree. */
function matchObject(o: Obj[] | Obj, predictor: (sub: Obj) => boolean): unknown[] {
  const result: unknown[] = []
  if (Array.isArray(o)) {
    o.forEach((item) => { result.push(...matchObject(item, predictor)) })
  } else if (typeCheck(o) === 'object') {
    if (predictor(o)) result.push(o)
    if (o.children) o.children.forEach((child) => { result.push(...matchObject(child, predictor)) })
  }
  return result
}

/**
 * Builds normalized shortcut definition list used by shortcut runtime adapter.
 */
export function buildShortcutActions(): ActionItemType[] {
  const actions = matchObject(
    deepClone(SHORTCUTS_DATA),
    (item) => !!item.shortcut,
  ) as ActionItemType[]

  // Inject transient toggle tool shortcut used for hold-space pan behavior.
  actions.push({
    id: 'toggleTool',
    shortcut: 'space',
  })

  return actions
}

/**
 * Resolves switch-tool payload into safe ToolName fallback.
 */
export function resolveSwitchToolName(value: unknown): ToolName {
  return (typeof value === 'string' && value.length > 0 ? value : 'selector') as ToolName
}
