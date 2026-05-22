/**
 * Declares concrete backend execution modes shared by renderer packages.
 */
export type RendererBackendMode = 'canvas2d' | 'webgl' | 'webgpu'

/**
 * Declares stable backend mode ordering used by capability and selection checks.
 */
export const RENDERER_BACKEND_MODES = ['canvas2d', 'webgl', 'webgpu'] as const satisfies readonly RendererBackendMode[]

/**
 * Describes one render packet consumed by backend execution paths.
 */
export interface RendererExecutionPacket {
  /** Stable packet identifier for diagnostics and replay traces. */
  id: string
  /** Packet category identifying execution branch in backend implementations. */
  kind: 'draw' | 'upload' | 'present'
  /** Backend-agnostic payload fields that adapters interpret per backend mode. */
  payload: Readonly<Record<string, unknown>>
}

/**
 * Describes capability flags exposed by one concrete backend implementation.
 */
export interface RendererBackendCapabilities {
  /** Whether the backend supports offscreen composition surfaces. */
  offscreenSurface: boolean
  /** Whether the backend supports GPU instancing for packet execution. */
  gpuInstancing: boolean
  /** Whether the backend supports asynchronous texture uploads. */
  asyncUpload: boolean
}

/**
 * Describes operational limits advertised by one backend implementation.
 */
export interface RendererBackendLimits {
  /** Maximum render target size supported by backend surface allocation. */
  maxRenderTargetSize: number
  /** Maximum packet count expected to run in one backend frame. */
  maxPacketsPerFrame: number
}

/**
 * Declares the shared backend execution contract for renderer package split.
 */
export interface RendererBackendExecutionContract {
  /** Concrete backend mode implemented by this execution contract instance. */
  mode: RendererBackendMode
  /** Capability flags advertised by this backend execution implementation. */
  capabilities: RendererBackendCapabilities
  /** Operational limits exposed for runtime planning and fallback policy. */
  limits: RendererBackendLimits
  /** Executes packet list at one frame timestamp and returns execution count. */
  executePackets: (timestampMs: number, packets: readonly RendererExecutionPacket[]) => number
  /** Applies one rendering surface resize mutation. */
  resize: (width: number, height: number) => void
  /** Releases backend-owned resources. */
  dispose: () => void
}

/**
 * Creates one deterministic no-op backend execution contract for staging paths.
 * @param mode Concrete backend mode represented by the no-op execution contract.
 * @returns Backend execution contract with stable no-op behavior.
 */
export function createNoopRendererBackendExecution(mode: RendererBackendMode): RendererBackendExecutionContract {
  let currentWidth = 0
  let currentHeight = 0

  return {
    mode,
    capabilities: {
      offscreenSurface: false,
      gpuInstancing: false,
      asyncUpload: false,
    },
    limits: {
      maxRenderTargetSize: 16384,
      maxPacketsPerFrame: 100000,
    },
    executePackets: (_timestampMs, packets) => {
      void currentWidth
      void currentHeight
      return packets.length
    },
    resize: (width, height) => {
      currentWidth = width
      currentHeight = height
    },
    dispose: () => {
      currentWidth = 0
      currentHeight = 0
    },
  }
}

/**
 * Describes one public contract descriptor used by docs and conformance checks.
 */
export interface RendererBackendContractDescriptor {
  /** Canonical contract name scoped by backend mode. */
  contractName: string
  /** Concrete backend mode represented by this descriptor. */
  mode: RendererBackendMode
  /** Stability level of current staging contract surface. */
  stability: 'alpha' | 'beta' | 'stable'
}

/**
 * Stores descriptor map for shared renderer backend contracts.
 */
export const RENDERER_BACKEND_CONTRACT_DESCRIPTORS = {
  canvas2d: {
    contractName: 'renderer.backend.canvas2d.execution',
    mode: 'canvas2d',
    stability: 'alpha',
  },
  webgl: {
    contractName: 'renderer.backend.webgl.execution',
    mode: 'webgl',
    stability: 'alpha',
  },
  webgpu: {
    contractName: 'renderer.backend.webgpu.execution',
    mode: 'webgpu',
    stability: 'alpha',
  },
} as const satisfies Readonly<Record<RendererBackendMode, RendererBackendContractDescriptor>>

/**
 * Resolves one renderer backend contract descriptor by backend mode.
 * @param mode Concrete backend mode used to select descriptor metadata.
 * @returns Descriptor metadata for the requested backend mode.
 */
export function resolveRendererBackendContractDescriptor(mode: RendererBackendMode): RendererBackendContractDescriptor {
  return RENDERER_BACKEND_CONTRACT_DESCRIPTORS[mode]
}
