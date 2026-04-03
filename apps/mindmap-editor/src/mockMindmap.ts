import type {DocumentNode, EditorDocument} from '@venus/document-core'

interface TopicNode {
  id: string
  label: string
  x: number
  y: number
  width: number
  height: number
  parentId?: string
}

function topicRect(topic: TopicNode): DocumentNode {
  return {
    id: `topic:${topic.id}`,
    type: 'rectangle',
    name: topic.label,
    x: topic.x,
    y: topic.y,
    width: topic.width,
    height: topic.height,
  }
}

function topicLabel(topic: TopicNode): DocumentNode {
  return {
    id: `label:${topic.id}`,
    type: 'text',
    name: topic.label,
    x: topic.x + 12,
    y: topic.y + 12,
    width: topic.width - 24,
    height: 24,
  }
}

function topicEdge(topic: TopicNode, topicsById: Map<string, TopicNode>): DocumentNode | null {
  if (!topic.parentId) {
    return null
  }

  const parent = topicsById.get(topic.parentId)
  if (!parent) {
    return null
  }

  const startX = parent.x + parent.width / 2
  const startY = parent.y + parent.height / 2
  const endX = topic.x + topic.width / 2
  const endY = topic.y + topic.height / 2

  return {
    id: `edge:${parent.id}:${topic.id}`,
    type: 'lineSegment',
    name: `${parent.label} -> ${topic.label}`,
    x: startX,
    y: startY,
    width: endX - startX,
    height: endY - startY,
  }
}

export function createMockMindmapDocument(
  mode: 'product' | 'learning',
): EditorDocument {
  const topics =
    mode === 'product'
      ? createProductTopics()
      : createLearningTopics()
  const topicsById = new Map(topics.map((topic) => [topic.id, topic]))
  const edges = topics
    .map((topic) => topicEdge(topic, topicsById))
    .filter((shape): shape is DocumentNode => shape !== null)
  const rectangles = topics.map(topicRect)
  const labels = topics.map(topicLabel)

  return {
    id: `mindmap-${mode}`,
    name: mode === 'product' ? 'Product Mindmap' : 'Learning Mindmap',
    width: 2200,
    height: 1400,
    shapes: [
      {
        id: 'frame:root',
        type: 'frame',
        name: 'Mindmap Frame',
        x: 0,
        y: 0,
        width: 2200,
        height: 1400,
      },
      ...edges,
      ...rectangles,
      ...labels,
    ],
  }
}

function createProductTopics(): TopicNode[] {
  return [
    {id: 'root', label: 'Canvas Platform', x: 950, y: 620, width: 220, height: 72},
    {id: 'runtime', label: 'Runtime Core', x: 620, y: 430, width: 200, height: 64, parentId: 'root'},
    {id: 'render', label: 'Render Layer', x: 1280, y: 430, width: 200, height: 64, parentId: 'root'},
    {id: 'viewer', label: 'Viewer Mode', x: 620, y: 820, width: 200, height: 64, parentId: 'root'},
    {id: 'editor', label: 'Editor Mode', x: 1280, y: 820, width: 200, height: 64, parentId: 'root'},
    {id: 'worker', label: 'Worker Commands', x: 420, y: 310, width: 188, height: 56, parentId: 'runtime'},
    {id: 'viewport', label: 'Viewport/Gesture', x: 420, y: 520, width: 188, height: 56, parentId: 'runtime'},
    {id: 'skia', label: 'Skia Renderer', x: 1510, y: 310, width: 188, height: 56, parentId: 'render'},
    {id: 'canvas2d', label: 'Canvas2D Renderer', x: 1510, y: 520, width: 188, height: 56, parentId: 'render'},
    {id: 'preview', label: 'Read-only Preview', x: 420, y: 940, width: 188, height: 56, parentId: 'viewer'},
    {id: 'embed', label: 'Embedded Widget', x: 620, y: 980, width: 188, height: 56, parentId: 'viewer'},
    {id: 'history', label: 'History/Selection', x: 1510, y: 940, width: 188, height: 56, parentId: 'editor'},
    {id: 'tools', label: 'Tools/Commands', x: 1280, y: 980, width: 188, height: 56, parentId: 'editor'},
  ]
}

function createLearningTopics(): TopicNode[] {
  return [
    {id: 'root', label: 'Mindmap Study Plan', x: 940, y: 620, width: 240, height: 72},
    {id: 'week1', label: 'Week 1 Basics', x: 560, y: 430, width: 206, height: 64, parentId: 'root'},
    {id: 'week2', label: 'Week 2 Runtime', x: 940, y: 380, width: 206, height: 64, parentId: 'root'},
    {id: 'week3', label: 'Week 3 Render', x: 1320, y: 430, width: 206, height: 64, parentId: 'root'},
    {id: 'week4', label: 'Week 4 Product', x: 940, y: 860, width: 206, height: 64, parentId: 'root'},
    {id: 'doc', label: 'Document Model', x: 360, y: 330, width: 190, height: 56, parentId: 'week1'},
    {id: 'gestures', label: 'Gesture Inputs', x: 360, y: 520, width: 190, height: 56, parentId: 'week1'},
    {id: 'worker', label: 'Worker Pipeline', x: 940, y: 250, width: 190, height: 56, parentId: 'week2'},
    {id: 'sab', label: 'Shared Memory', x: 1120, y: 300, width: 190, height: 56, parentId: 'week2'},
    {id: 'tiles', label: 'Tile Cache', x: 1500, y: 320, width: 190, height: 56, parentId: 'week3'},
    {id: 'lod', label: 'LOD Strategy', x: 1500, y: 520, width: 190, height: 56, parentId: 'week3'},
    {id: 'ui', label: 'Toolbar & Panels', x: 760, y: 980, width: 190, height: 56, parentId: 'week4'},
    {id: 'file', label: 'File Format', x: 1120, y: 980, width: 190, height: 56, parentId: 'week4'},
  ]
}
