import type { CreateEngineOptions } from "./createEngineContracts";

/**
 * Defines module dependencies required to compute startup validation snapshots.
 */
type CreateEngineValidationFoundationDependencies = {
  /** Product-adapter boundary validator module. */
  productAdapterBoundaryModule: {
    validateSafeInput: (options: CreateEngineOptions) => {
      violations: readonly unknown[];
    };
  };
  /** Public API surface validator module. */
  publicApiSurfaceModule: {
    validateDescriptors: (descriptors: readonly {
      name: string;
      level: "developer" | "advanced";
      stability: "stable" | "beta";
    }[]) => readonly unknown[];
  };
};

/**
 * Resolves product boundary and public API surface validation snapshots.
 * @param deps Validator dependencies from createEngine module wiring.
 * @param options Engine creation options under validation.
 */
export function createEngineValidationFoundation(
  deps: CreateEngineValidationFoundationDependencies,
  options: CreateEngineOptions,
): {
  boundaryValidation: { violations: readonly unknown[] };
  publicApiSurfaceViolations: readonly unknown[];
} {
  const boundaryValidation = deps.productAdapterBoundaryModule.validateSafeInput(options);
  const publicApiSurfaceViolations = deps.publicApiSurfaceModule.validateDescriptors([
    {
      name: "engine.setGraph",
      level: "developer",
      stability: "stable",
    },
    {
      name: "engine.runtime.submit",
      level: "advanced",
      stability: "beta",
    },
    {
      name: "engine.capability.render.renderFrame",
      level: "developer",
      stability: "stable",
    },
    {
      name: "engine.events.on",
      level: "developer",
      stability: "stable",
    },
  ]);

  return {
    boundaryValidation,
    publicApiSurfaceViolations,
  };
}
