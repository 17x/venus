// Compatibility forwarding module; layered command hit-test ownership lives in
// core/hit so renderer backends do not own hit-test composition.

export {
  hitTestLayeredCommands,
} from '../../core/hit/hitTest.ts'
