import assert from 'node:assert/strict'
import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  runRenderParityRuntimeReplayHistoryGate,
} from '../../../../scripts/render-parity-runtime-replay-history-gate.ts'
import {createDashboardFixture} from './render-parity-runtime-replay-history-gate.contract.test.helpers.ts'

test('render parity replay history gate run persists history and pass gate', async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'venus-replay-history-gate-'))
  const outputDir = path.join(tempRoot, 'reports')
  const dashboardPath = path.join(outputDir, 'runtime-replay.batch.dashboard.json')
  const historyPath = path.join(outputDir, 'runtime-replay.batch.history.json')
  const gatePath = path.join(outputDir, 'runtime-replay.batch.gate.json')

  try {
    await mkdir(outputDir, {recursive: true})
    await writeFile(
      dashboardPath,
      `${JSON.stringify(
        createDashboardFixture({generatedAt: '2026-05-24T03:00:00.000Z'}),
        null,
        2,
      )}\n`,
      'utf8',
    )

    const runResult = await runRenderParityRuntimeReplayHistoryGate({
      dashboardPath,
      historyFilePath: historyPath,
      gateOutputPath: gatePath,
      windowSize: 5,
      thresholds: {
        maxRegressed: 0,
        maxMixed: 0,
        maxUnknown: 0,
        minProcessedCount: 1,
      },
    })

    assert.equal(runResult.historyArtifact.totalSnapshots, 1)
    assert.equal(runResult.gateArtifact.status, 'pass')
    assert.equal(runResult.gateArtifact.reasons.length, 0)
    assert.equal(runResult.gateArtifact.failures.length, 0)
    assert.equal(runResult.historyArtifact.rollingFrameStageSchedulerModeCounter.unknown, 0)
    assert.equal(runResult.historyArtifact.rollingFrameStageSceneApplyModeCounter.unknown, 0)
    assert.equal(runResult.historyArtifact.rollingRuntimeResourceDecodeStatusCounter.unknown, 0)
    assert.equal(runResult.historyArtifact.rollingRuntimeResourceCompressionCodecCounter.unknown, 0)
    assert.equal(runResult.gateArtifact.rollingRuntimeResourceDecodeStatusCounter.unknown, 0)
    assert.equal(runResult.gateArtifact.rollingRuntimeResourceCompressionCodecCounter.unknown, 0)
  } finally {
    await rm(tempRoot, {recursive: true, force: true})
  }
})

/**
 * Verifies end-to-end history + gate run passes with stage unknown thresholds when dashboard stage counters are known.
 */
test('render parity replay history gate run passes with stage strict thresholds', async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'venus-replay-history-gate-stage-strict-'))
  const outputDir = path.join(tempRoot, 'reports')
  const dashboardPath = path.join(outputDir, 'runtime-replay.batch.dashboard.json')
  const historyPath = path.join(outputDir, 'runtime-replay.batch.history.json')
  const gatePath = path.join(outputDir, 'runtime-replay.batch.gate.json')

  try {
    await mkdir(outputDir, {recursive: true})
    await writeFile(
      dashboardPath,
      `${JSON.stringify(
        createDashboardFixture({
          generatedAt: '2026-05-24T04:00:00.000Z',
          frameStageSchedulerModeCounter: {
            interactive: 1,
            normal: 1,
            unknown: 0,
          },
          frameStageSceneApplyModeCounter: {
            none: 1,
            fullLoad: 0,
            previewLoad: 0,
            incrementalPatch: 1,
            unknown: 0,
          },
        }),
        null,
        2,
      )}\n`,
      'utf8',
    )

    const runResult = await runRenderParityRuntimeReplayHistoryGate({
      dashboardPath,
      historyFilePath: historyPath,
      gateOutputPath: gatePath,
      windowSize: 5,
      thresholds: {
        maxRegressed: 0,
        maxMixed: 0,
        maxUnknown: 0,
        minProcessedCount: 1,
        maxStageSchedulerUnknown: 0,
        maxStageSceneApplyUnknown: 0,
        maxRollingStageSchedulerUnknown: 0,
        maxRollingStageSceneApplyUnknown: 0,
      },
    })

    assert.equal(runResult.gateArtifact.status, 'pass')
    assert.equal(runResult.gateArtifact.failures.length, 0)
    assert.equal(runResult.historyFilePath, path.resolve(historyPath))
    assert.equal(runResult.gateOutputPath, path.resolve(gatePath))
    assert.equal(runResult.historyArtifact.rollingFrameStageSchedulerModeCounter.unknown, 0)
    assert.equal(runResult.historyArtifact.rollingFrameStageSceneApplyModeCounter.unknown, 0)
  } finally {
    await rm(tempRoot, {recursive: true, force: true})
  }
})

/**
 * Verifies latest scene-apply unknown-rate gate fails when the latest snapshot crosses configured latest rate threshold.
 */
test('render parity replay history gate run fails on latest stage scene-apply unknown rate threshold', async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'venus-replay-history-gate-scene-apply-rate-latest-'))
  const outputDir = path.join(tempRoot, 'reports')
  const dashboardPath = path.join(outputDir, 'runtime-replay.batch.dashboard.json')
  const historyPath = path.join(outputDir, 'runtime-replay.batch.history.json')
  const gatePath = path.join(outputDir, 'runtime-replay.batch.gate.json')

  try {
    await mkdir(outputDir, {recursive: true})
    await writeFile(
      dashboardPath,
      `${JSON.stringify(
        createDashboardFixture({
          generatedAt: '2026-05-24T06:30:00.000Z',
          frameStageSchedulerModeCounter: {
            interactive: 2,
            normal: 0,
            unknown: 0,
          },
          frameStageSceneApplyModeCounter: {
            none: 0,
            fullLoad: 0,
            previewLoad: 0,
            incrementalPatch: 0,
            unknown: 2,
          },
        }),
        null,
        2,
      )}\n`,
      'utf8',
    )

    const runResult = await runRenderParityRuntimeReplayHistoryGate({
      dashboardPath,
      historyFilePath: historyPath,
      gateOutputPath: gatePath,
      windowSize: 5,
      thresholds: {
        maxRegressed: 0,
        maxMixed: 0,
        maxUnknown: 0,
        minProcessedCount: 1,
        maxStageSceneApplyUnknownRatePercent: 40,
      },
    })

    assert.equal(runResult.gateArtifact.status, 'fail')
    assert.equal(runResult.gateArtifact.failures.length, 1)
    assert.equal(
      runResult.gateArtifact.failures[0]?.code,
      'RP_GATE_LATEST_STAGE_SCENE_APPLY_UNKNOWN_RATE',
    )
    assert.equal(
      runResult.gateArtifact.stageUnknownRatePercentSummary.latestStageSceneApplyUnknownRatePercent,
      100,
    )
  } finally {
    await rm(tempRoot, {recursive: true, force: true})
  }
})

/**
 * Verifies latest scheduler unknown-rate gate fails when the latest snapshot crosses configured latest rate threshold.
 */
test('render parity replay history gate run fails on latest stage scheduler unknown rate threshold', async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'venus-replay-history-gate-scheduler-rate-latest-'))
  const outputDir = path.join(tempRoot, 'reports')
  const dashboardPath = path.join(outputDir, 'runtime-replay.batch.dashboard.json')
  const historyPath = path.join(outputDir, 'runtime-replay.batch.history.json')
  const gatePath = path.join(outputDir, 'runtime-replay.batch.gate.json')

  try {
    await mkdir(outputDir, {recursive: true})
    await writeFile(
      dashboardPath,
      `${JSON.stringify(
        createDashboardFixture({
          generatedAt: '2026-05-24T06:45:00.000Z',
          frameStageSchedulerModeCounter: {
            interactive: 0,
            normal: 0,
            unknown: 2,
          },
          frameStageSceneApplyModeCounter: {
            none: 1,
            fullLoad: 0,
            previewLoad: 0,
            incrementalPatch: 1,
            unknown: 0,
          },
        }),
        null,
        2,
      )}\n`,
      'utf8',
    )

    const runResult = await runRenderParityRuntimeReplayHistoryGate({
      dashboardPath,
      historyFilePath: historyPath,
      gateOutputPath: gatePath,
      windowSize: 5,
      thresholds: {
        maxRegressed: 0,
        maxMixed: 0,
        maxUnknown: 0,
        minProcessedCount: 1,
        maxStageSchedulerUnknownRatePercent: 40,
      },
    })

    assert.equal(runResult.gateArtifact.status, 'fail')
    assert.equal(runResult.gateArtifact.failures.length, 1)
    assert.equal(
      runResult.gateArtifact.failures[0]?.code,
      'RP_GATE_LATEST_STAGE_SCHEDULER_UNKNOWN_RATE',
    )
    assert.equal(
      runResult.gateArtifact.stageUnknownRatePercentSummary.latestStageSchedulerUnknownRatePercent,
      100,
    )
  } finally {
    await rm(tempRoot, {recursive: true, force: true})
  }
})

/**
 * Verifies rolling stage unknown-rate gate fails when multi-snapshot history crosses configured rolling rate threshold.
 */
test('render parity replay history gate run fails on rolling stage unknown rate after fluctuation', async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'venus-replay-history-gate-stage-rate-rolling-'))
  const outputDir = path.join(tempRoot, 'reports')
  const dashboardPath = path.join(outputDir, 'runtime-replay.batch.dashboard.json')
  const historyPath = path.join(outputDir, 'runtime-replay.batch.history.json')
  const gatePath = path.join(outputDir, 'runtime-replay.batch.gate.json')

  try {
    await mkdir(outputDir, {recursive: true})
    await writeFile(
      dashboardPath,
      `${JSON.stringify(
        createDashboardFixture({
          generatedAt: '2026-05-24T05:00:00.000Z',
          frameStageSchedulerModeCounter: {
            interactive: 2,
            normal: 0,
            unknown: 0,
          },
          frameStageSceneApplyModeCounter: {
            none: 2,
            fullLoad: 0,
            previewLoad: 0,
            incrementalPatch: 0,
            unknown: 0,
          },
        }),
        null,
        2,
      )}\n`,
      'utf8',
    )

    const firstRunResult = await runRenderParityRuntimeReplayHistoryGate({
      dashboardPath,
      historyFilePath: historyPath,
      gateOutputPath: gatePath,
      windowSize: 5,
      thresholds: {
        maxRegressed: 0,
        maxMixed: 0,
        maxUnknown: 0,
        minProcessedCount: 1,
        maxRollingStageSchedulerUnknownRatePercent: 60,
      },
    })

    assert.equal(firstRunResult.gateArtifact.status, 'pass')

    await writeFile(
      dashboardPath,
      `${JSON.stringify(
        createDashboardFixture({
          generatedAt: '2026-05-24T06:00:00.000Z',
          frameStageSchedulerModeCounter: {
            interactive: 0,
            normal: 0,
            unknown: 2,
          },
          frameStageSceneApplyModeCounter: {
            none: 0,
            fullLoad: 0,
            previewLoad: 0,
            incrementalPatch: 0,
            unknown: 2,
          },
        }),
        null,
        2,
      )}\n`,
      'utf8',
    )

    const secondRunResult = await runRenderParityRuntimeReplayHistoryGate({
      dashboardPath,
      historyFilePath: historyPath,
      gateOutputPath: gatePath,
      windowSize: 5,
      thresholds: {
        maxRegressed: 0,
        maxMixed: 0,
        maxUnknown: 0,
        minProcessedCount: 1,
        maxRollingStageSchedulerUnknownRatePercent: 40,
      },
    })

    assert.equal(secondRunResult.gateArtifact.status, 'fail')
    assert.equal(secondRunResult.gateArtifact.failures.length, 1)
    assert.equal(
      secondRunResult.gateArtifact.failures[0]?.code,
      'RP_GATE_ROLLING_STAGE_SCHEDULER_UNKNOWN_RATE',
    )
    assert.equal(
      secondRunResult.gateArtifact.stageUnknownRatePercentSummary.rollingStageSchedulerUnknownRatePercent,
      50,
    )
  } finally {
    await rm(tempRoot, {recursive: true, force: true})
  }
})

/**
 * Verifies rolling scene-apply unknown-rate gate fails when multi-snapshot history crosses configured rolling rate threshold.
 */
test('render parity replay history gate run fails on rolling stage scene-apply unknown rate after fluctuation', async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'venus-replay-history-gate-scene-apply-rate-rolling-'))
  const outputDir = path.join(tempRoot, 'reports')
  const dashboardPath = path.join(outputDir, 'runtime-replay.batch.dashboard.json')
  const historyPath = path.join(outputDir, 'runtime-replay.batch.history.json')
  const gatePath = path.join(outputDir, 'runtime-replay.batch.gate.json')

  try {
    await mkdir(outputDir, {recursive: true})
    await writeFile(
      dashboardPath,
      `${JSON.stringify(
        createDashboardFixture({
          generatedAt: '2026-05-24T07:00:00.000Z',
          frameStageSchedulerModeCounter: {
            interactive: 2,
            normal: 0,
            unknown: 0,
          },
          frameStageSceneApplyModeCounter: {
            none: 2,
            fullLoad: 0,
            previewLoad: 0,
            incrementalPatch: 0,
            unknown: 0,
          },
        }),
        null,
        2,
      )}\n`,
      'utf8',
    )

    const firstRunResult = await runRenderParityRuntimeReplayHistoryGate({
      dashboardPath,
      historyFilePath: historyPath,
      gateOutputPath: gatePath,
      windowSize: 5,
      thresholds: {
        maxRegressed: 0,
        maxMixed: 0,
        maxUnknown: 0,
        minProcessedCount: 1,
        maxRollingStageSceneApplyUnknownRatePercent: 60,
      },
    })

    assert.equal(firstRunResult.gateArtifact.status, 'pass')

    await writeFile(
      dashboardPath,
      `${JSON.stringify(
        createDashboardFixture({
          generatedAt: '2026-05-24T08:00:00.000Z',
          frameStageSchedulerModeCounter: {
            interactive: 2,
            normal: 0,
            unknown: 0,
          },
          frameStageSceneApplyModeCounter: {
            none: 0,
            fullLoad: 0,
            previewLoad: 0,
            incrementalPatch: 0,
            unknown: 2,
          },
        }),
        null,
        2,
      )}\n`,
      'utf8',
    )

    const secondRunResult = await runRenderParityRuntimeReplayHistoryGate({
      dashboardPath,
      historyFilePath: historyPath,
      gateOutputPath: gatePath,
      windowSize: 5,
      thresholds: {
        maxRegressed: 0,
        maxMixed: 0,
        maxUnknown: 0,
        minProcessedCount: 1,
        maxRollingStageSceneApplyUnknownRatePercent: 40,
      },
    })

    assert.equal(secondRunResult.gateArtifact.status, 'fail')
    assert.equal(secondRunResult.gateArtifact.failures.length, 1)
    assert.equal(
      secondRunResult.gateArtifact.failures[0]?.code,
      'RP_GATE_ROLLING_STAGE_SCENE_APPLY_UNKNOWN_RATE',
    )
    assert.equal(
      secondRunResult.gateArtifact.stageUnknownRatePercentSummary.rollingStageSceneApplyUnknownRatePercent,
      50,
    )
  } finally {
    await rm(tempRoot, {recursive: true, force: true})
  }
})

