// Compatibility forwarding barrel; layered hit-test ownership lives in core/hit
// and renderer backend modules should not import this surface for new code.

export {
  hitTestLayeredCommands,
} from '../../core/hit/index.ts'

export {
  hitTestBaseLayer,
} from '../../core/hit/index.ts'

export {
  hitTestActiveLayer,
} from '../../core/hit/index.ts'
