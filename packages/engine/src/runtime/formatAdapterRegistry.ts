/**
 * Declares the FBX/OBJ adapter extension contract.
 * Supports optional format-specific adapters behind the canonical scene asset abstraction.
 */
export interface EngineFormatAdapter {
  /** Source format identifier (e.g. "fbx", "obj"). */
  format: string;
  /** File extensions supported by this adapter. */
  extensions: readonly string[];
  /** Parses raw file bytes into an intermediate scene representation. */
  parse(data: ArrayBuffer, sourceUri: string): Promise<Record<string, unknown>>;
}

/**
 * Declares the FBX/OBJ adapter extension registry.
 * Maintains a collection of format adapters behind optional module boundaries.
 */
export interface EngineFormatAdapterRegistry {
  /** Registers one format adapter. */
  register(adapter: EngineFormatAdapter): void;
  /** Finds an adapter for one file extension. Returns null if none registered. */
  findForExtension(extension: string): EngineFormatAdapter | null;
  /** Returns all registered format identifiers. */
  getRegisteredFormats(): readonly string[];
}

/**
 * Creates an empty format adapter registry.
 */
export function createEngineFormatAdapterRegistry(): EngineFormatAdapterRegistry {
  const adapters: EngineFormatAdapter[] = [];

  return {
    register: (adapter) => {
      adapters.push(adapter);
    },
    findForExtension: (extension) => {
      const normalized = extension.toLowerCase().replace(/^\./, "");
      return adapters.find((a) =>
        a.extensions.some((ext) => ext.toLowerCase().replace(/^\./, "") === normalized),
      ) ?? null;
    },
    getRegisteredFormats: () => adapters.map((a) => a.format),
  };
}
