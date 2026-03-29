export interface RuntimeMindmapV1 {
  version: 1
  core: unknown
  metadata: {
    rootTopicId: string
    defaultBranchDirection: 'AUTO' | 'LEFT' | 'RIGHT'
  }
}

export type RuntimeMindmapLatest = RuntimeMindmapV1
export type RuntimeMindmapAny = RuntimeMindmapV1
