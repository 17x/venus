import type {VenusModule} from '../../Venus.ts'

/** Creates the optional animation module marker. */
export function createVenusAnimateModule(): VenusModule {
  return {
    name: 'animate',
    requires: ['scheduler'],
    install: () => ({}),
  }
}
