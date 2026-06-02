export interface PlaygroundScenarioInteractionHarness {
  scenarioId: string
  controls: readonly string[]
  telemetry: readonly string[]
  deterministicStateKeys: readonly string[]
}

export const PLAYGROUND_SCENARIO_INTERACTION_HARNESSES: readonly PlaygroundScenarioInteractionHarness[] = [
  {scenarioId: 's1-medical-volume-slice-runtime', controls: ['slice scrub', 'fit view'], telemetry: ['nodes', 'draw', 'webglPath'], deterministicStateKeys: ['revision', 'sliceIndex']},
  {scenarioId: 's2-preop-path-simulation', controls: ['path step replay', 'pick waypoint'], telemetry: ['nodes', 'draw', 'selectedWaypoint'], deterministicStateKeys: ['revision', 'stepIndex']},
  {scenarioId: 's3-bim-collab-review', controls: ['layer toggle', 'pick element'], telemetry: ['nodes', 'draw', 'activeLayer'], deterministicStateKeys: ['revision', 'visibleLayers']},
  {scenarioId: 's4-cad-assembly-validation', controls: ['part isolate', 'measure clearance'], telemetry: ['nodes', 'draw', 'measurement'], deterministicStateKeys: ['revision', 'isolatedPartId']},
  {scenarioId: 's5-gis-live-map-streaming', controls: ['viewport filter', 'severity layer toggle'], telemetry: ['nodes', 'draw', 'visibleEvents'], deterministicStateKeys: ['revision', 'severityLevel']},
  {scenarioId: 's6-autodrive-twin-replay', controls: ['play replay', 'seek timeline'], telemetry: ['nodes', 'draw', 'timelineTime'], deterministicStateKeys: ['revision', 'replayTime']},
  {scenarioId: 's7-city-twin-monitor-wall', controls: ['quality toggle', 'filter band'], telemetry: ['nodes', 'draw', 'quality'], deterministicStateKeys: ['revision', 'qualityPreset']},
  {scenarioId: 's8-commerce-product-variant-runtime', controls: ['variant switch', 'pick card'], telemetry: ['nodes', 'draw', 'variantId'], deterministicStateKeys: ['revision', 'variantId']},
  {scenarioId: 's9-molecular-volume-exploration', controls: ['cluster filter', 'depth range'], telemetry: ['nodes', 'draw', 'depthRange'], deterministicStateKeys: ['revision', 'clusterFilter']},
  {scenarioId: 's10-game-editor-runtime-preview', controls: ['play preview', 'runtime preview step', 'stop preview', 'pick node'], telemetry: ['nodes', 'draw', 'previewStep'], deterministicStateKeys: ['revision', 'previewStep']},
  {scenarioId: 's11-node-headless-rendering', controls: ['capture frame', 'compare revision'], telemetry: ['nodes', 'draw', 'captureId'], deterministicStateKeys: ['revision', 'captureId']},
  {scenarioId: 's12-vector-editor-optin-2d', controls: ['edit control point', 'toggle handles'], telemetry: ['nodes', 'draw', 'selectedHandle'], deterministicStateKeys: ['revision', 'handleVisibility']},
  {scenarioId: 's13-video-timeline-composition', controls: ['seek timeline', 'toggle track'], telemetry: ['nodes', 'draw', 'trackVisibility'], deterministicStateKeys: ['revision', 'timelineTime']},
] as const
