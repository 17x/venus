import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import path from 'node:path'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '../../..')

const steps = [
  {
    label: 'TypeScript Build (matrix chain)',
    command: [
      'pnpm',
      'exec',
      'tsc',
      '-b',
      'packages/document-core/tsconfig.json',
      'packages/canvas-base/tsconfig.json',
      'packages/editor-worker/tsconfig.json',
      'packages/shared-memory/tsconfig.json',
      'apps/vector-editor-web/tsconfig.app.json',
      'apps/runtime-playground/tsconfig.app.json',
      '--pretty',
      'false',
    ],
  },
  {
    label: 'Transform Invariants Doc Presence',
    command: [
      'test',
      '-f',
      'docs/ai-standards/core/matrix-compatibility-invariants.md',
    ],
  },
  {
    label: 'Regression Runbook Doc Presence',
    command: [
      'test',
      '-f',
      'docs/ai-standards/core/matrix-regression-scenarios.md',
    ],
  },
]

let hasFailure = false

for (const step of steps) {
  console.log(`\n[MatrixCheck] ${step.label}`)
  console.log(`[MatrixCheck] $ ${step.command.join(' ')}`)

  const result = spawnSync(step.command[0], step.command.slice(1), {
    stdio: 'inherit',
    cwd: repoRoot,
    shell: false,
  })

  if (result.status !== 0) {
    hasFailure = true
    console.error(`[MatrixCheck] FAILED: ${step.label}`)
    break
  }

  console.log(`[MatrixCheck] PASSED: ${step.label}`)
}

if (hasFailure) {
  process.exit(1)
}

console.log('\n[MatrixCheck] All checks passed.')
