// Compatibility forwarding module; backend-neutral camera unprojection ownership
// lives in core/camera rather than renderer backend directories.

export {
  unprojectScreenPoint,
} from '../../core/camera/unproject.ts'
