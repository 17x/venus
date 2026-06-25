// Compatibility forwarding module; active-layer hit-test ownership lives in
// core/hit so renderer backends do not own interaction hit priority.

export {
  hitTestActiveLayer,
} from '../../core/hit/hitTestActive.ts'
