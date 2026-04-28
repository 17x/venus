/// <reference types="node" />
import assert from 'node:assert/strict'
import test from 'node:test'

import {createLogger, type LogEntry} from './logger.ts'

test('createLogger filters entries below minimum level', () => {
  const entries: LogEntry[] = []
  const logger = createLogger({
    level: 'warn',
    sink: (entry) => {
      entries.push(entry)
    },
  })

  logger.info('ignored')
  logger.warn('kept')

  assert.deepEqual(entries.map((entry) => entry.message), ['kept'])
})

test('createLogger forwards meta payload to sink', () => {
  const entries: LogEntry[] = []
  const logger = createLogger({
    sink: (entry) => {
      entries.push(entry)
    },
  })

  logger.error('failure', {code: 'E_TEST'})

  assert.deepEqual(entries[0], {
    level: 'error',
    message: 'failure',
    meta: {code: 'E_TEST'},
  })
})

