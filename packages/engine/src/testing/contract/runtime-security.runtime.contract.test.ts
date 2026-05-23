import assert from "node:assert/strict";
import test from "node:test";

import {
  ENGINE_RUNTIME_SECURITY_API,
  resolveEngineRuntimeSecurityApiDescriptor,
} from "../../orchestration/runtime/security/runtime-security.contract";

/**
 * Verifies runtime security descriptor map keeps expected endpoint set.
 */
test("runtime security descriptor set is complete", () => {
  assert.deepEqual(Object.keys(ENGINE_RUNTIME_SECURITY_API).sort(), [
    "getAuditLog",
    "setResourceAccessPolicy",
    "setTrustLevel",
  ]);
});

/**
 * Verifies runtime security descriptors keep required error semantics.
 */
test("runtime security descriptors keep required error semantics", () => {
  const trustDescriptor = ENGINE_RUNTIME_SECURITY_API.setTrustLevel;
  const policyDescriptor = ENGINE_RUNTIME_SECURITY_API.setResourceAccessPolicy;

  assert.deepEqual(trustDescriptor.errorCodes, ["ENGINE_SECURITY_INVALID_TRUST_LEVEL"]);
  assert.deepEqual(policyDescriptor.errorCodes, [
    "ENGINE_SECURITY_INVALID_POLICY",
    "ENGINE_SECURITY_QUOTA_EXCEEDED",
  ]);
  assert.equal(trustDescriptor.level, "developer");
  assert.equal(trustDescriptor.stability, "beta");
});

/**
 * Verifies runtime security descriptor resolver returns canonical map entries.
 */
test("runtime security descriptor resolver returns canonical entries", () => {
  assert.deepEqual(
    resolveEngineRuntimeSecurityApiDescriptor("setTrustLevel"),
    ENGINE_RUNTIME_SECURITY_API.setTrustLevel,
  );
  assert.deepEqual(
    resolveEngineRuntimeSecurityApiDescriptor("setResourceAccessPolicy"),
    ENGINE_RUNTIME_SECURITY_API.setResourceAccessPolicy,
  );
  assert.deepEqual(
    resolveEngineRuntimeSecurityApiDescriptor("getAuditLog"),
    ENGINE_RUNTIME_SECURITY_API.getAuditLog,
  );
});
