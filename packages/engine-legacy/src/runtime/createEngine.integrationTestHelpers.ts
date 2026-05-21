export {
  createOverlappingScene,
  createScene,
  createTextHeavyScene,
} from './integrationTestSceneFixtures.ts'

export {
  installFakeCanvasEnvironment,
  type FakeCanvasEnvironment,
  type RecordedDrawCall,
  type RecordedWebGPUCommandSummary,
  type RecordedWebGPUPass,
} from './integrationTestCanvasEnvironment.ts'

export {
  createFakeClock,
  type FakeClockHarness,
  type RecordedStats,
} from './integrationTestClockHarness.ts'
