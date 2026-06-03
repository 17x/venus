import type {CommandEnvelopeSource} from '@venus/editor-primitive'
import type {EditorRuntimeCommand} from '../../runtime/worker/index.ts'

export type Vector2DCommandFamily =
  | 'file'
  | 'history'
  | 'selection'
  | 'transform'
  | 'style'
  | 'path'
  | 'text'
  | 'layer'
  | 'shape'
  | 'group'
  | 'mask'
  | 'boolean'
  | 'viewport'
  | 'tool'
  | 'snapping'
  | 'export'

export type Vector2DCommandBeforeAfterPolicy =
  | 'none'
  | 'document-patch'
  | 'history-stack'
  | 'selection-state'
  | 'tool-state'
  | 'transient-state'
  | 'viewport-state'

export type Vector2DCommandMergePolicy =
  | 'none'
  | 'transaction'
  | 'continuous'

export interface Vector2DCommandFamilyDescriptor {
  family: Vector2DCommandFamily
  ownsDocumentMutation: boolean
  requiresRuntimeDispatch: boolean
}

export interface Vector2DCommandContract {
  commandType: EditorRuntimeCommand['type']
  family: Vector2DCommandFamily
  targetIds: string[]
  beforeAfterPolicy: Vector2DCommandBeforeAfterPolicy
  mergePolicy: Vector2DCommandMergePolicy
  diagnostics: string[]
}

export const VECTOR2D_COMMAND_FAMILIES: readonly Vector2DCommandFamilyDescriptor[] = [
  {family: 'file', ownsDocumentMutation: false, requiresRuntimeDispatch: false},
  {family: 'history', ownsDocumentMutation: true, requiresRuntimeDispatch: true},
  {family: 'selection', ownsDocumentMutation: true, requiresRuntimeDispatch: true},
  {family: 'transform', ownsDocumentMutation: true, requiresRuntimeDispatch: true},
  {family: 'style', ownsDocumentMutation: true, requiresRuntimeDispatch: true},
  {family: 'path', ownsDocumentMutation: true, requiresRuntimeDispatch: true},
  {family: 'text', ownsDocumentMutation: true, requiresRuntimeDispatch: true},
  {family: 'layer', ownsDocumentMutation: true, requiresRuntimeDispatch: true},
  {family: 'shape', ownsDocumentMutation: true, requiresRuntimeDispatch: true},
  {family: 'group', ownsDocumentMutation: true, requiresRuntimeDispatch: true},
  {family: 'mask', ownsDocumentMutation: true, requiresRuntimeDispatch: true},
  {family: 'boolean', ownsDocumentMutation: true, requiresRuntimeDispatch: true},
  {family: 'viewport', ownsDocumentMutation: false, requiresRuntimeDispatch: true},
  {family: 'tool', ownsDocumentMutation: false, requiresRuntimeDispatch: true},
  {family: 'snapping', ownsDocumentMutation: false, requiresRuntimeDispatch: false},
  {family: 'export', ownsDocumentMutation: false, requiresRuntimeDispatch: false},
]

export function resolveVector2DCommandFamily(commandType: EditorRuntimeCommand['type']): Vector2DCommandFamily {
  if (commandType.startsWith('history.')) return 'history'
  if (commandType.startsWith('selection.')) return 'selection'
  if (commandType.startsWith('viewport.')) return 'viewport'
  if (commandType.startsWith('tool.')) return 'tool'
  if (commandType.startsWith('snapping.')) return 'snapping'
  if (commandType.startsWith('group.')) return 'group'
  if (commandType.startsWith('mask.')) return 'mask'

  switch (commandType) {
    case 'shape.move':
    case 'shape.resize':
    case 'shape.rotate':
    case 'shape.rotate.batch':
    case 'shape.transform.batch':
    case 'shape.align':
    case 'shape.distribute':
      return 'transform'
    case 'shape.patch':
      return 'style'
    case 'shape.convert-to-path':
      return 'path'
    case 'shape.rename':
      return 'text'
    case 'shape.reorder':
      return 'layer'
    case 'shape.group':
    case 'shape.ungroup':
      return 'group'
    case 'shape.set-clip':
      return 'mask'
    case 'shape.boolean':
      return 'boolean'
    case 'shape.insert':
    case 'shape.insert.batch':
    case 'shape.remove':
      return 'shape'
    default:
      return 'shape'
  }
}

export function resolveVector2DCommandTargetIds(command: EditorRuntimeCommand): string[] {
  switch (command.type) {
    case 'selection.set':
      return command.shapeIds ?? (command.shapeId ? [command.shapeId] : [])
    case 'shape.move':
    case 'shape.resize':
    case 'shape.rotate':
    case 'shape.patch':
    case 'shape.set-clip':
    case 'shape.reorder':
    case 'shape.remove':
      return [command.shapeId]
    case 'shape.rotate.batch':
      return command.rotations.map((item) => item.shapeId)
    case 'shape.transform.batch':
      return command.transforms.map((item) => item.id)
    case 'shape.insert':
      return [command.shape.id]
    case 'shape.insert.batch':
      return command.shapes.map((shape) => shape.id)
    case 'shape.group':
    case 'shape.convert-to-path':
    case 'shape.boolean':
    case 'shape.align':
    case 'shape.distribute':
      return command.shapeIds ?? []
    case 'shape.ungroup':
    case 'group.enter-isolation':
      return command.groupId ? [command.groupId] : []
    default:
      return []
  }
}

export function resolveVector2DCommandBeforeAfterPolicy(
  commandType: EditorRuntimeCommand['type'],
): Vector2DCommandBeforeAfterPolicy {
  if (commandType === 'history.undo' || commandType === 'history.redo') return 'history-stack'
  if (commandType.startsWith('selection.')) return 'selection-state'
  if (commandType.startsWith('viewport.')) return 'viewport-state'
  if (commandType.startsWith('tool.') || commandType.startsWith('group.')) return 'tool-state'
  if (commandType.startsWith('snapping.') || commandType.startsWith('mask.select-')) return 'transient-state'
  if (commandType.startsWith('mask.')) return 'document-patch'
  if (commandType.startsWith('shape.')) return 'document-patch'
  return 'none'
}

export function resolveVector2DCommandMergePolicy(commandType: EditorRuntimeCommand['type']): Vector2DCommandMergePolicy {
  switch (commandType) {
    case 'shape.move':
    case 'shape.resize':
    case 'shape.rotate':
    case 'shape.rotate.batch':
    case 'shape.transform.batch':
    case 'shape.patch':
      return 'continuous'
    case 'snapping.pause':
    case 'snapping.resume':
    case 'selection.cycle-hit-target':
    case 'group.enter-isolation':
    case 'group.exit-isolation':
    case 'mask.select-host':
    case 'mask.select-source':
      return 'none'
    default:
      return 'transaction'
  }
}

export function resolveVector2DCommandEnvelopeSource(input: {
  dispatchDepth: number
  requestedSource?: CommandEnvelopeSource
}): CommandEnvelopeSource {
  if (input.requestedSource === 'system') return 'system'
  return input.dispatchDepth === 0 ? 'user' : 'derived'
}

export function resolveVector2DCommandContract(command: EditorRuntimeCommand): Vector2DCommandContract {
  const family = resolveVector2DCommandFamily(command.type)
  const beforeAfterPolicy = resolveVector2DCommandBeforeAfterPolicy(command.type)
  const mergePolicy = resolveVector2DCommandMergePolicy(command.type)

  return {
    commandType: command.type,
    family,
    targetIds: resolveVector2DCommandTargetIds(command),
    beforeAfterPolicy,
    mergePolicy,
    diagnostics: [
      `v2d.command.family.${family}`,
      `v2d.command.beforeAfter.${beforeAfterPolicy}`,
      `v2d.command.merge.${mergePolicy}`,
    ],
  }
}