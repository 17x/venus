/**
 * Declares one render pass in the declarative pass graph.
 */
export interface EngineRenderPass {
  /** Unique pass identifier for graph ordering. */
  id: string;
  /** Pass name for diagnostics and debugging. */
  name: string;
  /** Render target id this pass writes to (null = screen). */
  targetId: string | null;
  /** Pass ids that must execute before this pass. */
  dependencies: readonly string[];
  /** Whether this pass is enabled for the current frame. */
  enabled: boolean;
  /** Optional pass-specific configuration payload. */
  config?: Record<string, unknown>;
}

/**
 * Declares a render target descriptor for off-screen rendering.
 */
export interface EngineRenderTarget {
  /** Unique target identifier. */
  id: string;
  /** Target width in pixels. */
  width: number;
  /** Target height in pixels. */
  height: number;
  /** Color attachment count. */
  colorAttachmentCount: number;
  /** Whether a depth attachment is present. */
  hasDepth: boolean;
  /** Whether a stencil attachment is present. */
  hasStencil: boolean;
  /** Sample count for multisampled targets (1 = no MSAA). */
  samples: number;
}

/**
 * Declares the declarative render pass graph for multipass orchestration.
 * Passes are topologically sorted by dependency order.
 */
export interface EngineRenderPassGraph {
  /** Ordered render passes in execution order. */
  passes: readonly EngineRenderPass[];
  /** Render targets referenced by passes. */
  targets: readonly EngineRenderTarget[];
}

/**
 * Creates an empty render pass graph.
 */
export function createEmptyRenderPassGraph(): EngineRenderPassGraph {
  return { passes: [], targets: [] };
}

/**
 * Topologically sorts render passes by dependency order (Kahn's algorithm).
 * Returns passes in valid execution order, or the original order if cyclic.
 * @param passes Unordered render passes.
 */
export function topologicalSortPasses(
  passes: readonly EngineRenderPass[],
): readonly EngineRenderPass[] {
  const passById = new Map(passes.map((p) => [p.id, p]));
  const inDegree = new Map(passes.map((p) => [p.id, 0]));
  const adjacency = new Map<string, string[]>(passes.map((p) => [p.id, []]));

  for (const pass of passes) {
    for (const dep of pass.dependencies) {
      if (passById.has(dep)) {
        adjacency.get(dep)?.push(pass.id);
        inDegree.set(pass.id, (inDegree.get(pass.id) ?? 0) + 1);
      }
    }
  }

  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) {
      queue.push(id);
    }
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);
    for (const neighbor of adjacency.get(current) ?? []) {
      const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  // Cyclic graph fallback: return original order.
  if (sorted.length !== passes.length) {
    return passes;
  }

  return sorted.map((id) => passById.get(id)!).filter(Boolean);
}
