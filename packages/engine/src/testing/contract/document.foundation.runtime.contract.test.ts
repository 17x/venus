import assert from "node:assert/strict";
import test from "node:test";

import {
  ENGINE_RUNTIME_DOCUMENT_FOUNDATION_API,
  resolveEngineRuntimeDocumentFoundationApiDescriptor,
} from "../../runtime/document/document.foundation.contract";

/**
 * Verifies runtime document foundation API descriptor map keeps expected endpoint set.
 */
test("runtime document foundation descriptor set is complete", () => {
  assert.deepEqual(Object.keys(ENGINE_RUNTIME_DOCUMENT_FOUNDATION_API).sort(), [
    "applyChangeSet",
    "createSnapshot",
    "deserializeSnapshot",
    "diffSnapshots",
    "getRevision",
    "getSchemaVersion",
    "rebaseChangeSet",
    "serializeSnapshot",
    "validateSnapshot",
  ]);
});

/**
 * Verifies runtime document foundation applyChangeSet descriptor carries required error semantics.
 */
test("runtime document foundation applyChangeSet keeps required error codes", () => {
  const descriptor = ENGINE_RUNTIME_DOCUMENT_FOUNDATION_API.applyChangeSet;

  assert.deepEqual(descriptor.errorCodes, [
    "ENGINE_DOCUMENT_INVALID_CHANGESET",
    "ENGINE_DOCUMENT_REVISION_CONFLICT",
  ]);
  assert.equal(descriptor.level, "foundation");
  assert.equal(descriptor.stability, "beta");
  assert.equal(descriptor.determinism.length > 0, true);
});

/**
 * Verifies descriptor resolver returns canonical descriptors by map key.
 */
test("runtime document foundation descriptor resolver returns canonical entries", () => {
  assert.deepEqual(
    resolveEngineRuntimeDocumentFoundationApiDescriptor("createSnapshot"),
    ENGINE_RUNTIME_DOCUMENT_FOUNDATION_API.createSnapshot,
  );
  assert.deepEqual(
    resolveEngineRuntimeDocumentFoundationApiDescriptor("validateSnapshot"),
    ENGINE_RUNTIME_DOCUMENT_FOUNDATION_API.validateSnapshot,
  );
  assert.deepEqual(
    resolveEngineRuntimeDocumentFoundationApiDescriptor("getRevision"),
    ENGINE_RUNTIME_DOCUMENT_FOUNDATION_API.getRevision,
  );
  assert.deepEqual(
    resolveEngineRuntimeDocumentFoundationApiDescriptor("getSchemaVersion"),
    ENGINE_RUNTIME_DOCUMENT_FOUNDATION_API.getSchemaVersion,
  );
  assert.deepEqual(
    resolveEngineRuntimeDocumentFoundationApiDescriptor("applyChangeSet"),
    ENGINE_RUNTIME_DOCUMENT_FOUNDATION_API.applyChangeSet,
  );
  assert.deepEqual(
    resolveEngineRuntimeDocumentFoundationApiDescriptor("diffSnapshots"),
    ENGINE_RUNTIME_DOCUMENT_FOUNDATION_API.diffSnapshots,
  );
  assert.deepEqual(
    resolveEngineRuntimeDocumentFoundationApiDescriptor("rebaseChangeSet"),
    ENGINE_RUNTIME_DOCUMENT_FOUNDATION_API.rebaseChangeSet,
  );
  assert.deepEqual(
    resolveEngineRuntimeDocumentFoundationApiDescriptor("serializeSnapshot"),
    ENGINE_RUNTIME_DOCUMENT_FOUNDATION_API.serializeSnapshot,
  );
  assert.deepEqual(
    resolveEngineRuntimeDocumentFoundationApiDescriptor("deserializeSnapshot"),
    ENGINE_RUNTIME_DOCUMENT_FOUNDATION_API.deserializeSnapshot,
  );
});
