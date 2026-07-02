import type {VenusModule} from '../../Venus.ts'

/** Creates the optional camera module marker. */
export function createVenusCameraModule(): VenusModule {
  return {
    name: 'camera',
    requires: ['viewport'],
    install: () => ({}),
  }
}
