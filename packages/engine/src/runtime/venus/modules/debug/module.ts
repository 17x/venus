import type {VenusModule} from '../../Venus.ts'

/** Creates the optional debug module marker. */
export function createVenusDebugModule(): VenusModule {
  return {
    name: 'debug',
    install: () => ({}),
  }
}
