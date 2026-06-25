// Compatibility forwarding module; layered hit-test ownership lives in core/hit
// so renderer backends do not own command hit-test policy.

export {
  hitTestBaseLayer,
} from '../../core/hit/hitTestBase.ts'
