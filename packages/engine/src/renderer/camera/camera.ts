// Compatibility forwarding module; backend-neutral camera helper ownership lives
// in core/camera rather than renderer backend directories.

export {
  createRenderCameraProjector,
} from '../../core/camera/camera.ts'
