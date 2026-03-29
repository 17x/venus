export interface RuntimeStreamlineV1 {
  version: 1
  core: unknown
  metadata: {
    boardId: string
    laneMode: boolean
  }
}

export type RuntimeStreamlineLatest = RuntimeStreamlineV1
export type RuntimeStreamlineAny = RuntimeStreamlineV1
