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
  /** Stores number of drawIndexed calls issued on the pass encoder. */
  drawIndexedCallCount: number
  /** Stores accumulated vertex count submitted through draw calls. */
  drawnVertexCount: number
  /** Stores accumulated index count submitted through drawIndexed calls. */
  drawnIndexCount: number
  /** Stores number of render pipeline creation calls. */
  pipelineCreateCount: number
  /** Stores number of buffer creation calls. */
  bufferCreateCount: number
  /** Stores number of setPipeline calls issued on pass encoders. */
  setPipelineCount: number
  /** Stores number of setVertexBuffer calls issued on pass encoders. */
  setVertexBufferCount: number
  /** Stores number of setIndexBuffer calls issued on pass encoders. */
  setIndexBufferCount: number
  /** Stores render pipeline descriptors received by createRenderPipeline. */
  pipelineDescriptors: Array<Record<string, unknown>>
  /** Stores buffer descriptors received by createBuffer. */
  bufferDescriptors: Array<Record<string, unknown>>
  /** Stores number of queue writeBuffer calls issued per frame. */
  writeBufferCallCount: number
  /** Stores total uploaded bytes across queue writeBuffer calls. */
  uploadedBufferBytes: number
  /** Stores number of encoder writeTimestamp calls issued per frame. */
  timestampWriteCount: number
  /** Stores number of encoder resolveQuerySet calls issued per frame. */
  timestampResolveCount: number
  /** Stores number of encoder copyBufferToBuffer calls issued per frame. */
  timestampCopyCount: number
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
        features: new Set(['timestamp-query']),
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
      /**
       * Handles writeBuffer.
       * @param _buffer Destination buffer token.
       * @param _bufferOffset Destination byte offset.
       * @param data Typed array payload source.
       */
      writeBuffer(_buffer: unknown, _bufferOffset: number, data: unknown) {
        const latestSummary = recordedWebGPUCommands[recordedWebGPUCommands.length - 1]
        if (!latestSummary) {
          return
        }

        latestSummary.writeBufferCallCount += 1
        latestSummary.uploadedBufferBytes += resolveByteLength(data)
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
        drawIndexedCallCount: 0,
        drawnVertexCount: 0,
        drawnIndexCount: 0,
        pipelineCreateCount: 0,
        bufferCreateCount: 0,
        setPipelineCount: 0,
        setVertexBufferCount: 0,
        setIndexBufferCount: 0,
        pipelineDescriptors: [],
        bufferDescriptors: [],
        writeBufferCallCount: 0,
        uploadedBufferBytes: 0,
        timestampWriteCount: 0,
        timestampResolveCount: 0,
        timestampCopyCount: 0,
      }
      recordedWebGPUCommands.push(summary)

      return {
        /**
         * Handles writeTimestamp.
         */
        writeTimestamp() {
          summary.timestampWriteCount += 1
        },
        /**
         * Handles resolveQuerySet.
         */
        resolveQuerySet() {
          summary.timestampResolveCount += 1
        },
        /**
         * Handles copyBufferToBuffer.
         */
        copyBufferToBuffer() {
          summary.timestampCopyCount += 1
        },
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
             * Handles setIndexBuffer.
             */
            setIndexBuffer() {
              summary.setIndexBufferCount += 1
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
            /**
             * Handles drawIndexed.
             * @param indexCount Draw index count.
             */
            drawIndexed(indexCount?: unknown) {
              summary.drawIndexedCallCount += 1
              if (typeof indexCount === 'number' && Number.isFinite(indexCount)) {
                summary.drawnIndexCount += indexCount
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
     * @param descriptor Pipeline descriptor passed by renderer code.
     */
    createRenderPipeline(descriptor?: unknown) {
      const latestSummary = recordedWebGPUCommands[recordedWebGPUCommands.length - 1]
      if (latestSummary) {
        latestSummary.pipelineCreateCount += 1
        if (isRecord(descriptor)) {
          latestSummary.pipelineDescriptors.push(descriptor)
        }
      }
      return {}
    },
    /**
     * Handles createBuffer.
     * @param descriptor Buffer descriptor passed by renderer code.
     */
    createBuffer(descriptor?: unknown) {
      const latestSummary = recordedWebGPUCommands[recordedWebGPUCommands.length - 1]
      if (latestSummary) {
        latestSummary.bufferCreateCount += 1
        if (isRecord(descriptor)) {
          latestSummary.bufferDescriptors.push(descriptor)
        }
      }
      return {}
    },
    /**
     * Handles createQuerySet.
     */
    createQuerySet() {
      return {}
    },
  }
}

/**
 * Verifies one unknown value is a plain key-value object record.
 * @param candidate Unknown value that may represent a descriptor object.
 */
function isRecord(candidate: unknown): candidate is Record<string, unknown> {
  return typeof candidate === 'object' && candidate !== null
}

/**
 * Resolves byte length from typed-array or ArrayBuffer-like payloads.
 * @param data Unknown payload passed into writeBuffer.
 */
function resolveByteLength(data: unknown): number {
  if (ArrayBuffer.isView(data)) {
    return data.byteLength
  }

  if (data instanceof ArrayBuffer) {
    return data.byteLength
  }

  return 0
}
