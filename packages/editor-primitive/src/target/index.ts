export type {
  InteractionTarget,
  InteractionTargetCandidate,
  InteractionTargetPriority,
  ResolveInteractionTargetInput,
} from './InteractionTarget.ts'
export {resolveInteractionTarget} from './InteractionTarget.ts'
export {
  createTargetStack,
  pickNextTarget,
  pickPrimaryTarget,
  resolveTargetStack,
} from './TargetStack.ts'
export type {TargetStack} from './TargetStack.ts'
