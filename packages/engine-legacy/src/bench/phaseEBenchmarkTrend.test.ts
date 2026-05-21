import assert from 'node:assert/strict'
import test from 'node:test'

import { validateEngineBenchmarkSuiteCases } from './benchmarkSuiteContract.ts'
import { detectEnginePerfRegressionTrend } from './perfTrendAnalyzer.ts'

test('benchmark suite validator enforces non-empty unique ids', () => {
  assert.equal(validateEngineBenchmarkSuiteCases([{ id: 'a', scenario: 's' }]), true)
  assert.equal(validateEngineBenchmarkSuiteCases([{ id: 'a', scenario: 's' }, { id: 'a', scenario: 'x' }]), false)
})

test('perf trend analyzer detects sustained regression trend', () => {
  assert.equal(detectEnginePerfRegressionTrend([
    { index: 0, value: 10 },
    { index: 1, value: 12 },
    { index: 2, value: 14 },
  ]), true)
  assert.equal(detectEnginePerfRegressionTrend([
    { index: 0, value: 10 },
    { index: 1, value: 9 },
    { index: 2, value: 11 },
  ]), false)
})
