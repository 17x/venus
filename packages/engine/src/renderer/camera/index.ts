// Compatibility forwarding barrel; backend-neutral camera helper ownership lives
// in core/camera and renderer backend modules should not own camera contracts.

export {
  createRenderCameraProjector,
} from '../../core/camera/index.ts'

export {
  projectWorldPoint,
} from '../../core/camera/index.ts'

export {
  unprojectScreenPoint,
} from '../../core/camera/index.ts'
