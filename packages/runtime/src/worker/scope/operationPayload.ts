import type {CollaborationOperation} from '../collaboration.ts'
import type {EditorRuntimeCommand} from '../protocol.ts'
import {cloneCornerRadii, cloneFill, cloneShadow, cloneStroke} from './model.ts'

export function createLocalOperation(command: EditorRuntimeCommand, actorId: string): CollaborationOperation {
  return {
    id: `${command.type}:${Date.now()}`,
    type: command.type,
    actorId,
    payload: getCommandPayload(command),
  }
}

function getCommandPayload(command: EditorRuntimeCommand): CollaborationOperation['payload'] {
  if (command.type === 'tool.select') return {tool: command.tool}
  if (command.type === 'shape.move') return {shapeId: command.shapeId, x: command.x, y: command.y}
  if (command.type === 'shape.rename') return {shapeId: command.shapeId, name: command.name, text: command.text}
  if (command.type === 'shape.resize') return {shapeId: command.shapeId, width: command.width, height: command.height}
  if (command.type === 'shape.rotate') return {shapeId: command.shapeId, rotation: command.rotation}
  if (command.type === 'shape.rotate.batch') {
    return {rotations: command.rotations.map((item) => ({shapeId: item.shapeId, rotation: item.rotation}))}
  }
  if (command.type === 'shape.transform.batch') {
    return {
      transforms: command.transforms
        .map((item) => ({id: item.id, fromMatrix: item.fromMatrix, toMatrix: item.toMatrix}))
        .filter((item): item is {id: string; fromMatrix: NonNullable<typeof item.fromMatrix>; toMatrix: NonNullable<typeof item.toMatrix>} => item !== null),
    }
  }
  if (command.type === 'shape.patch') {
    const patchPayload: Record<string, unknown> = {}
    if (Object.prototype.hasOwnProperty.call(command.patch, 'fill')) patchPayload.fill = cloneFill(command.patch.fill)
    if (Object.prototype.hasOwnProperty.call(command.patch, 'stroke')) patchPayload.stroke = cloneStroke(command.patch.stroke)
    if (Object.prototype.hasOwnProperty.call(command.patch, 'shadow')) patchPayload.shadow = cloneShadow(command.patch.shadow)
    if (Object.prototype.hasOwnProperty.call(command.patch, 'cornerRadius')) patchPayload.cornerRadius = command.patch.cornerRadius
    if (Object.prototype.hasOwnProperty.call(command.patch, 'cornerRadii')) patchPayload.cornerRadii = cloneCornerRadii(command.patch.cornerRadii)
    if (Object.prototype.hasOwnProperty.call(command.patch, 'ellipseStartAngle')) patchPayload.ellipseStartAngle = command.patch.ellipseStartAngle
    if (Object.prototype.hasOwnProperty.call(command.patch, 'ellipseEndAngle')) patchPayload.ellipseEndAngle = command.patch.ellipseEndAngle
    if (Object.prototype.hasOwnProperty.call(command.patch, 'flipX')) patchPayload.flipX = command.patch.flipX
    if (Object.prototype.hasOwnProperty.call(command.patch, 'flipY')) patchPayload.flipY = command.patch.flipY
    return {shapeId: command.shapeId, patch: patchPayload}
  }
  if (command.type === 'shape.set-clip') return {shapeId: command.shapeId, clipPathId: command.clipPathId, clipRule: command.clipRule}
  if (command.type === 'shape.reorder') return {shapeId: command.shapeId, toIndex: command.toIndex}
  if (command.type === 'shape.insert') return {shape: command.shape, index: command.index}
  if (command.type === 'shape.insert.batch') return {shapes: command.shapes, index: command.index}
  if (command.type === 'shape.remove') return {shapeId: command.shapeId}
  return undefined
}
