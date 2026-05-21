/**
 * Severity level used by runtime diagnostics events.
 */
export type EngineDiagnosticsSeverity = "info" | "warning" | "error";

/**
 * Diagnostics event payload emitted by runtime/modules/adapters.
 */
export interface EngineDiagnosticsEvent {
  /** Machine-readable event code. */
  code: string;
  /** Human-readable event message. */
  message: string;
  /** Event severity for diagnostics consumers. */
  severity: EngineDiagnosticsSeverity;
  /** Optional module identifier associated with the event. */
  moduleId?: string;
}

/**
 * Diagnostics boundary contract for runtime observability sinks.
 */
export interface EngineDiagnosticsPort {
  /** Records one diagnostics event in deterministic order. */
  record: (event: EngineDiagnosticsEvent) => void;
}
