import type {RuntimeRenderDiagnostics} from '../events/index/index.ts'
import type {RenderParityDiagnosticsSample} from './renderParityChecklist.ts'

/**
 * Declares supported JSON container shapes for runtime diagnostics export payloads.
 */
export interface RuntimeDiagnosticsExportPayload {
  /** Stores diagnostics records when payload uses {records: [...]} envelope shape. */
  records?: unknown
  /** Stores diagnostics records when payload uses {diagnostics: [...]} envelope shape. */
  diagnostics?: unknown
}

/**
 * Extracts runtime diagnostics records from one unknown JSON payload.
 * @param payload Unknown JSON payload from runtime diagnostics export.
 */
export function extractRuntimeDiagnosticsRecords(
  payload: unknown,
): RuntimeRenderDiagnostics[] {
  if (Array.isArray(payload)) {
    return payload.map((row, index) => normalizeRuntimeDiagnosticsRecord(row, index))
  }

  if (payload && typeof payload === 'object') {
    const container = payload as RuntimeDiagnosticsExportPayload
    if (Array.isArray(container.records)) {
      return container.records.map((row, index) => normalizeRuntimeDiagnosticsRecord(row, index))
    }
    if (Array.isArray(container.diagnostics)) {
      return container.diagnostics.map((row, index) => normalizeRuntimeDiagnosticsRecord(row, index))
    }
  }

  throw new Error('Runtime diagnostics export JSON must be an array or an object containing records/diagnostics arrays.')
}

/**
 * Converts runtime diagnostics records into sampled parity input rows.
 * @param records Runtime diagnostics records extracted from export payload.
 */
export function createParitySamplesFromRuntimeDiagnostics(
  records: readonly RuntimeRenderDiagnostics[],
): RenderParityDiagnosticsSample[] {
  return records.map((record) => ({
    webglRenderPath: record.webglRenderPath,
    webgpuRenderPath: record.webgpuRenderPath,
    cacheFallbackReason: record.cacheFallbackReason,
    webglInteractiveTextFallbackCount: record.webglInteractiveTextFallbackCount,
    webglDeferredTextTextureCount: record.webglDeferredTextTextureCount,
    webglDeferredImageTextureCount: record.webglDeferredImageTextureCount,
    webglImageTextureUploadCount: record.webglImageTextureUploadCount,
    webglBudgetPressure: record.webglBudgetPressure,
    webgpuNativeRectBatchRejectedReason: record.webgpuNativeRectBatchRejectedReason,
    webglFeatureCapabilityGateReason: record.webglFeatureCapabilityGateReason ?? 'none',
    webgpuFeatureCapabilityGateReason: record.webgpuFeatureCapabilityGateReason ?? 'none',
    webgpuNativeSubmissionAttemptedCount: record.webgpuNativeSubmissionAttemptedCount,
  }))
}

/**
 * Normalizes one runtime diagnostics record from unknown JSON payload.
 * @param row Unknown JSON row.
 * @param index Row index used for error diagnostics.
 */
function normalizeRuntimeDiagnosticsRecord(
  row: unknown,
  index: number,
): RuntimeRenderDiagnostics {
  if (!row || typeof row !== 'object') {
    throw new Error(`Runtime diagnostics row ${index} must be an object.`)
  }

  return row as RuntimeRenderDiagnostics
}
