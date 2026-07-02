import type {VenusModule} from '../../Venus.ts'

/** Creates the optional hit-test module marker. */
export function createVenusHitTestModule(): VenusModule {
  return {
    name: 'hitTest',
    requires: ['spatial', 'geometryCache'],
    install: () => ({}),
  }
}
