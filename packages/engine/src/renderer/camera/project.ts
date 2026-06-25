// Compatibility forwarding module; backend-neutral camera projection ownership
// lives in core/camera rather than renderer backend directories.

export {
  projectWorldPoint,
} from '../../core/camera/project.ts'
