import type {
  EnginePublicApiDescriptor,
  EnginePublicApiSurfaceModule,
  EnginePublicApiViolation,
} from "./publicApiSurface.contract";

const ALLOWED_PREFIXES = [
  "engine.",
  "engine.runtime.",
  "engine.capability.",
  "engine.events.",
] as const;

const FORBIDDEN_SEMANTIC_PREFIXES = [
  "engine.medical.",
  "engine.bim.",
  "engine.gis.",
  "engine.cad.",
  "engine.finance.",
  "engine.video.",
  "engine.game.",
] as const;

/**
 * Creates public API surface module for namespace-policy validation and deterministic catalogs.
 */
export function createEnginePublicApiSurfaceModule(): EnginePublicApiSurfaceModule {
  return {
    validateDescriptors: (descriptors) => resolvePublicApiViolations(descriptors),
    createDeterministicCatalog: (descriptors) =>
      descriptors.slice().sort((left, right) => left.name.localeCompare(right.name)),
  };
}

/**
 * Resolves policy violations for public API descriptors.
 * @param descriptors Candidate descriptors declared by public API contracts.
 */
function resolvePublicApiViolations(
  descriptors: readonly EnginePublicApiDescriptor[],
): readonly EnginePublicApiViolation[] {
  const violations: EnginePublicApiViolation[] = [];

  for (const descriptor of descriptors) {
    if (!ALLOWED_PREFIXES.some((prefix) => descriptor.name.startsWith(prefix))) {
      violations.push({
        name: descriptor.name,
        reason: "public API namespace is not allowed",
      });
    }

    if (
      FORBIDDEN_SEMANTIC_PREFIXES.some((prefix) => descriptor.name.startsWith(prefix))
    ) {
      violations.push({
        name: descriptor.name,
        reason: "public API includes forbidden industry semantic prefix",
      });
    }
  }

  return violations.sort((left, right) => left.name.localeCompare(right.name));
}
