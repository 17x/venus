/**
 * Stores one captured fake WebGPU pass payload from integration tests.
 */
export interface RecordedWebGPUPass {
  /** Stores clear color used by the submitted render pass. */
  clearValue: {r: number; g: number; b: number; a: number}
}

/**
 * Stores one captured fake WebGPU command summary per frame submit.
 */
export interface RecordedWebGPUCommandSummary {
  /** Stores pass payloads that were attached to one command encoder. */
  passes: RecordedWebGPUPass[]
  /** Stores how many times the encoder finish method was called. */
  finishCount: number
  /** Stores number of command buffers submitted in one queue submit call. */
  submittedBufferCount: number
  /** Stores number of draw calls issued on the pass encoder. */
  drawCallCount: number
  /** Stores accumulated vertex count submitted through draw calls. */
  drawnVertexCount: number
  /** Stores number of render pipeline creation calls. */
  pipelineCreateCount: number
  /** Stores number of buffer creation calls. */
  bufferCreateCount: number
  /** Stores number of setPipeline calls issued on pass encoders. */
  setPipelineCount: number
  /** Stores number of setVertexBuffer calls issued on pass encoders. */
  setVertexBufferCount: number
}

/**
 * Creates one fake WebGPU canvas context used by integration tests.
 * @param recordedWebGPUCommands Mutable command trace sink.
 */
export function createFakeWebGPUContext(
  recordedWebGPUCommands: RecordedWebGPUCommandSummary[],
) {
  const fakeGpu = {
    getPreferredCanvasFormat() {
      return 'bgra8unorm'
    },
    async requestAdapter() {
      return {
        async requestDevice() {
          return createFakeWebGPUDevice(recordedWebGPUCommands)
        },
      }
    },
  }

  return {
    configure() {},
    gpu: fakeGpu,
    getPreferredCanvasFormat: fakeGpu.getPreferredCanvasFormat,
    requestAdapter: fakeGpu.requestAdapter,
    getCurrentTexture() {
      return {
        createView() {
          return {}
        },
      }
    },
  }
}

/**
 * Creates one fake WebGPU device with command-encoder and queue stubs.
 * @param recordedWebGPUCommands Mutable command trace sink.
 */
export function createFakeWebGPUDevice(
  recordedWebGPUCommands: RecordedWebGPUCommandSummary[],
) {
  return {
    queue: {
      /**
       * Handles submit.
       * @param commandBuffers Command buffers submitted by renderer code.
       */
      submit(commandBuffers: unknown[]) {
        const submittedBufferCount = Array.isArray(commandBuffers)
          ? commandBuffers.length
          : 0
        const latestSummary = recordedWebGPUCommands[recordedWebGPUCommands.length - 1]
        if (!latestSummary) {
          return
        }
        latestSummary.submittedBufferCount = submittedBufferCount
      },
    },
    /**
     * Handles createCommandEncoder.
     */
    createCommandEncoder() {
      const summary: RecordedWebGPUCommandSummary = {
        passes: [],
        finishCount: 0,
        submittedBufferCount: 0,
        drawCallCount: 0,
        drawnVertexCount: 0,
        pipelineCreateCount: 0,
        bufferCreateCount: 0,
        setPipelineCount: 0,
        setVertexBufferCount: 0,
      }
      recordedWebGPUCommands.push(summary)

      return {
        /**
         * Handles beginRenderPass.
         * @param descriptor Render pass descriptor.
         */
        beginRenderPass(descriptor?: {
          colorAttachments?: Array<{
            clearValue?: {r?: number; g?: number; b?: number; a?: number}
          }>
        }) {
          const clearValue = descriptor?.colorAttachments?.[0]?.clearValue
          summary.passes.push({
            clearValue: {
              r: clearValue?.r ?? 0,
              g: clearValue?.g ?? 0,
              b: clearValue?.b ?? 0,
              a: clearValue?.a ?? 0,
            },
          })

          return {
            /**
             * Handles setPipeline.
             */
            setPipeline() {
              summary.setPipelineCount += 1
            },
            /**
             * Handles setVertexBuffer.
             */
            setVertexBuffer() {
              summary.setVertexBufferCount += 1
            },
            /**
             * Handles draw.
             * @param vertexCount Draw vertex count.
             */
            draw(vertexCount?: unknown) {
              summary.drawCallCount += 1
              if (typeof vertexCount === 'number' && Number.isFinite(vertexCount)) {
                summary.drawnVertexCount += vertexCount
              }
            },
            end() {},
          }
        },
        /**
         * Handles finish.
         */
        finish() {
          summary.finishCount += 1
          return {}
        },
      }
    },
    /**
     * Handles createRenderPipeline.
     */
    createRenderPipeline() {
      const latestSummary = recordedWebGPUCommands[recordedWebGPUCommands.length - 1]
      if (latestSummary) {
        latestSummary.pipelineCreateCount += 1
      }
      return {}
    },
    /**
     * Handles createBuffer.
     */
    createBuffer() {
      const latestSummary = recordedWebGPUCommands[recordedWebGPUCommands.length - 1]
      if (latestSummary) {
        latestSummary.bufferCreateCount += 1
      }
      return {}
    },
  }
}