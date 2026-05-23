import assert from 'node:assert/strict'
import test from 'node:test'

import {normalizeFile} from '../readFileNormalize.ts'

test('normalizeFile preserves extension-like fields for legacy workspace payload', () => {
  const normalized = normalizeFile({
    id: 'file-1',
    name: 'Legacy',
    version: '1.0.0',
    createdAt: 1,
    updatedAt: 2,
    config: {page: {unit: 'px', width: 100, height: 100, dpi: 72}},
    schema: {name: 'venus.vector.document', version: 1, major: 1, minor: 2},
    pages: [{id: 'page-a', name: 'Page A', width: 100, height: 100}],
    activePageId: 'page-a',
    lifecycle: {state: 'dirty', dirty: true},
    styleReferences: {fills: {f1: {name: 'Fill 1'}}, strokes: {}, texts: {}, effects: {}},
    extensions: {vendor: {flag: true}},
    workspace: [
      {
        elements: [{id: 'shape-1', type: 'rectangle'}],
        assets: [{id: 'asset-1', name: 'A', type: 'image', mimeType: 'image/png'}],
      },
    ],
  })

  assert.equal(normalized.id, 'file-1')
  assert.equal(normalized.activePageId, 'page-a')
  assert.equal(normalized.pages?.length, 1)
  assert.equal(normalized.lifecycle?.state, 'dirty')
  assert.equal(normalized.schema?.major, 1)
  assert.equal(normalized.schema?.minor, 2)
  assert.deepEqual(normalized.extensions, {vendor: {flag: true}})
  assert.equal(normalized.elements.length, 1)
  assert.equal(normalized.assets?.length, 1)
})

test('normalizeFile backfills elements/assets arrays for modern payloads', () => {
  const normalized = normalizeFile({
    id: 'file-2',
    name: 'Modern',
    version: '1.0.0',
    createdAt: 3,
    updatedAt: 4,
    config: {page: {unit: 'px', width: 120, height: 80, dpi: 72}},
  })

  assert.deepEqual(normalized.elements, [])
  assert.deepEqual(normalized.assets, [])
})

test('normalizeFile downgrades to readonly recovery mode for unsupported schema major', () => {
  const normalized = normalizeFile({
    id: 'file-unsupported',
    name: 'Unsupported',
    version: '9.0.0',
    createdAt: 10,
    updatedAt: 11,
    schema: {name: 'venus.vector.document', version: 9, major: 9, minor: 0},
    config: {page: {unit: 'px', width: 200, height: 100, dpi: 72}},
    elements: [{id: 'shape-1', type: 'rectangle'}],
  })

  assert.equal(normalized.lifecycle?.state, 'recovery')
  assert.equal(normalized.config.editor?.readOnly, true)
  assert.equal(normalized.config.editor?.migrationDiagnostics?.[0]?.code, 'migration.schema.unsupported-major')
  assert.equal(normalized.elements.length, 1)
})

test('normalizeFile preserves crash-recovery replay payload in editor config', () => {
  const normalized = normalizeFile({
    id: 'file-replay',
    name: 'Replay Fixture',
    version: '1.0.0',
    createdAt: 20,
    updatedAt: 21,
    schema: {name: 'venus.vector.document', version: 1, major: 1, minor: 0},
    config: {
      page: {unit: 'px', width: 200, height: 100, dpi: 72},
      editor: {
        crashRecoveryReplayMode: 'local-only',
        crashRecoveryReplay: {
          maxEntries: 2,
          localOnly: {
            mode: 'local-only',
            entries: [
              {
                id: 'l1',
                label: 'move-a',
                source: 'local',
                forward: [],
                backward: [],
                transactionId: 'runtime-txn-1',
                issuedAt: 100,
              },
            ],
          },
          merged: {
            mode: 'merged',
            entries: [
              {
                id: 'l1',
                label: 'move-a',
                source: 'local',
                forward: [],
                backward: [],
              },
              {
                id: 'r1',
                label: 'remote-sync',
                source: 'remote',
                forward: [],
                backward: [],
              },
            ],
          },
        },
      },
    },
    elements: [],
    assets: [],
  })

  assert.equal(normalized.config.editor?.crashRecoveryReplay?.maxEntries, 2)
  assert.equal(normalized.config.editor?.crashRecoveryReplay?.localOnly.mode, 'local-only')
  assert.equal(normalized.config.editor?.crashRecoveryReplay?.merged.entries.length, 2)
  assert.equal(normalized.config.editor?.crashRecoveryReplayMode, 'local-only')
})

test('normalizeFile emits deterministic contract snapshot projection for modern payload', () => {
  const normalized = normalizeFile({
    id: 'file-snapshot',
    name: 'Snapshot Fixture',
    version: '1.0.0',
    createdAt: 40,
    updatedAt: 41,
    config: {page: {unit: 'px', width: 1280, height: 720, dpi: 72}},
    schema: {name: 'venus.vector.document', version: 1, major: 1, minor: 0},
    elements: [{id: 'shape-snapshot-1', type: 'rectangle'}],
    assets: [{id: 'asset-snapshot-1', name: 'Asset', type: 'image', mimeType: 'image/png'}],
    pages: [{id: 'page-main', name: 'Main', width: 1280, height: 720}],
    activePageId: 'page-main',
    lifecycle: {state: 'dirty', dirty: true},
    extensions: {vendor: {release: '2026-05-23'}},
  })

  const snapshot = {
    schema: normalized.schema,
    page: normalized.config.page,
    editor: normalized.config.editor,
    lifecycle: normalized.lifecycle,
    pages: normalized.pages,
    activePageId: normalized.activePageId,
    elements: normalized.elements,
    assets: normalized.assets,
    extensions: normalized.extensions,
  }

  assert.deepEqual(snapshot, {
    schema: {name: 'venus.vector.document', version: 1, major: 1, minor: 0},
    page: {unit: 'px', width: 1280, height: 720, dpi: 72},
    editor: {
      readOnly: false,
      migrationDiagnostics: undefined,
      crashRecoveryReplay: undefined,
      crashRecoveryReplayMode: 'merged',
    },
    lifecycle: {state: 'dirty', dirty: true},
    pages: [{id: 'page-main', name: 'Main', width: 1280, height: 720}],
    activePageId: 'page-main',
    elements: [{id: 'shape-snapshot-1', type: 'rectangle'}],
    assets: [{id: 'asset-snapshot-1', name: 'Asset', type: 'image', mimeType: 'image/png'}],
    extensions: {vendor: {release: '2026-05-23'}},
  })
})
