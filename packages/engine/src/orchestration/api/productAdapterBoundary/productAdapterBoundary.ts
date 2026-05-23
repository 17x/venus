import type {
  EngineProductAdapterBoundaryModule,
  EngineProductBoundaryValidationResult,
  EngineProductBoundaryViolation,
} from "./productAdapterBoundary.contract";

const FORBIDDEN_KEYWORDS = [
  "undo",
  "redo",
  "history",
  "autosave",
  "collaborationSession",
  "uiStore",
] as const;

/**
 * Creates product-adapter boundary helpers that enforce semantic isolation policy.
 */
export function createEngineProductAdapterBoundaryModule(): EngineProductAdapterBoundaryModule {
  return {
    validateSafeInput: (input) => resolveBoundaryValidation(input),
    assertSafeInput: (input) => {
      const validation = resolveBoundaryValidation(input);
      if (!validation.safe) {
        const reasons = validation.violations
          .map((violation) => `${violation.path}: ${violation.reason}`)
          .join("; ");
        throw new Error(`Engine product-adapter boundary violation: ${reasons}`);
      }
    },
  };
}

/**
 * Validates one payload against forbidden product-semantics keys.
 * @param input Arbitrary adapter payload that will be normalized for engine input.
 */
function resolveBoundaryValidation(
  input: unknown,
): EngineProductBoundaryValidationResult {
  const violations: EngineProductBoundaryViolation[] = [];
  collectBoundaryViolations(input, "$", violations);

  return {
    safe: violations.length === 0,
    violations,
  };
}

/**
 * Recursively collects boundary violations for object-like payloads.
 * @param input Current payload node under traversal.
 * @param path Current dot-path used for diagnostics.
 * @param violations Mutable violation list.
 */
function collectBoundaryViolations(
  input: unknown,
  path: string,
  violations: EngineProductBoundaryViolation[],
): void {
  if (!input || typeof input !== "object") {
    return;
  }

  if (Array.isArray(input)) {
    for (let index = 0; index < input.length; index += 1) {
      collectBoundaryViolations(input[index], `${path}[${index}]`, violations);
    }
    return;
  }

  const record = input as Record<string, unknown>;
  const keys = Object.keys(record).sort((left, right) => left.localeCompare(right));
  for (const key of keys) {
    const normalized = key.toLowerCase();
    for (const forbiddenKeyword of FORBIDDEN_KEYWORDS) {
      if (normalized.includes(forbiddenKeyword)) {
        violations.push({
          path: `${path}.${key}`,
          reason: `forbidden product semantic key contains '${forbiddenKeyword}'`,
        });
      }
    }
    collectBoundaryViolations(record[key], `${path}.${key}`, violations);
  }
}
