import type {EditorDocument} from '../../../model/index.ts'
import {
  attachSceneMemory,
  createSceneMemory,
  writeDocumentToScene,
  type SceneMemory,
} from '../../../shared-memory/index.ts'

/**
 * Creates a deterministic worker scene memory snapshot for patch-planning tests.
 * @param document Source document used to seed shared memory.
 */
export function createSceneFixture(document: EditorDocument): SceneMemory {
  const buffer = createSceneMemory(Math.max(16, document.shapes.length + 8))
  const scene = attachSceneMemory(buffer, Math.max(16, document.shapes.length + 8))
  writeDocumentToScene(scene, document)
  return scene
}

/**
 * Creates one compact document fixture where all target nodes share one parent group.
 */
export function createFlatGroupFixture(): EditorDocument {
  return {
    id: 'doc-1',
    name: 'fixture',
    width: 1000,
    height: 1000,
    shapes: [
      {
        id: 'group-root',
        type: 'group',
        name: 'Root',
        parentId: null,
        childIds: ['rect-a', 'rect-b', 'rect-c'],
        x: 0,
        y: 0,
        width: 300,
        height: 100,
      },
      {
        id: 'rect-a',
        type: 'rectangle',
        name: 'A',
        parentId: 'group-root',
        x: 0,
        y: 0,
        width: 50,
        height: 50,
      },
      {
        id: 'rect-b',
        type: 'rectangle',
        name: 'B',
        parentId: 'group-root',
        x: 80,
        y: 0,
        width: 50,
        height: 50,
      },
      {
        id: 'rect-c',
        type: 'rectangle',
        name: 'C',
        parentId: 'group-root',
        x: 160,
        y: 0,
        width: 50,
        height: 50,
      },
    ],
  }
}

/**
 * Creates one grouped fixture for ungroup parity validation.
 */
export function createGroupedFixture(): EditorDocument {
  return {
    id: 'doc-2',
    name: 'grouped',
    width: 1000,
    height: 1000,
    shapes: [
      {
        id: 'group-root',
        type: 'group',
        name: 'Root',
        parentId: null,
        childIds: ['group-temp', 'rect-c'],
        x: 0,
        y: 0,
        width: 400,
        height: 200,
      },
      {
        id: 'group-temp',
        type: 'group',
        name: 'Temp',
        parentId: 'group-root',
        childIds: ['rect-a', 'rect-b'],
        x: 0,
        y: 0,
        width: 150,
        height: 80,
      },
      {
        id: 'rect-a',
        type: 'rectangle',
        name: 'A',
        parentId: 'group-temp',
        x: 0,
        y: 0,
        width: 50,
        height: 50,
      },
      {
        id: 'rect-b',
        type: 'rectangle',
        name: 'B',
        parentId: 'group-temp',
        x: 80,
        y: 0,
        width: 50,
        height: 50,
      },
      {
        id: 'rect-c',
        type: 'rectangle',
        name: 'C',
        parentId: 'group-root',
        x: 220,
        y: 0,
        width: 50,
        height: 50,
      },
    ],
  }
}

/**
 * Creates one nested-parent fixture for reorder parity checks inside grouped subtrees.
 */
export function createNestedReorderFixture(): EditorDocument {
  return {
    id: 'doc-3',
    name: 'nested reorder',
    width: 1000,
    height: 1000,
    shapes: [
      {
        id: 'group-root',
        type: 'group',
        name: 'Root',
        parentId: null,
        childIds: ['group-a', 'group-b'],
        x: 0,
        y: 0,
        width: 500,
        height: 300,
      },
      {
        id: 'group-a',
        type: 'group',
        name: 'Group A',
        parentId: 'group-root',
        childIds: ['rect-a', 'rect-b', 'rect-c'],
        x: 0,
        y: 0,
        width: 260,
        height: 120,
      },
      {
        id: 'rect-a',
        type: 'rectangle',
        name: 'A',
        parentId: 'group-a',
        x: 0,
        y: 0,
        width: 40,
        height: 40,
      },
      {
        id: 'rect-b',
        type: 'rectangle',
        name: 'B',
        parentId: 'group-a',
        x: 80,
        y: 0,
        width: 40,
        height: 40,
      },
      {
        id: 'rect-c',
        type: 'rectangle',
        name: 'C',
        parentId: 'group-a',
        x: 160,
        y: 0,
        width: 40,
        height: 40,
      },
      {
        id: 'group-b',
        type: 'group',
        name: 'Group B',
        parentId: 'group-root',
        childIds: ['rect-d'],
        x: 300,
        y: 0,
        width: 120,
        height: 120,
      },
      {
        id: 'rect-d',
        type: 'rectangle',
        name: 'D',
        parentId: 'group-b',
        x: 320,
        y: 20,
        width: 40,
        height: 40,
      },
    ],
  }
}

/**
 * Creates one cross-parent fixture used to validate regroup parity across different source groups.
 */
export function createCrossParentFixture(): EditorDocument {
  return {
    id: 'doc-4',
    name: 'cross parent',
    width: 1200,
    height: 800,
    shapes: [
      {
        id: 'group-root',
        type: 'group',
        name: 'Root',
        parentId: null,
        childIds: ['group-left', 'group-right'],
        x: 0,
        y: 0,
        width: 600,
        height: 240,
      },
      {
        id: 'group-left',
        type: 'group',
        name: 'Left',
        parentId: 'group-root',
        childIds: ['rect-a', 'rect-b'],
        x: 0,
        y: 0,
        width: 220,
        height: 120,
      },
      {
        id: 'group-right',
        type: 'group',
        name: 'Right',
        parentId: 'group-root',
        childIds: ['rect-c', 'rect-d'],
        x: 260,
        y: 0,
        width: 220,
        height: 120,
      },
      {
        id: 'rect-a',
        type: 'rectangle',
        name: 'A',
        parentId: 'group-left',
        x: 10,
        y: 10,
        width: 40,
        height: 40,
      },
      {
        id: 'rect-b',
        type: 'rectangle',
        name: 'B',
        parentId: 'group-left',
        x: 90,
        y: 10,
        width: 40,
        height: 40,
      },
      {
        id: 'rect-c',
        type: 'rectangle',
        name: 'C',
        parentId: 'group-right',
        x: 280,
        y: 10,
        width: 40,
        height: 40,
      },
      {
        id: 'rect-d',
        type: 'rectangle',
        name: 'D',
        parentId: 'group-right',
        x: 360,
        y: 10,
        width: 40,
        height: 40,
      },
    ],
  }
}

/**
 * Creates one nested temporary-group fixture for ungroup parity checks.
 */
export function createNestedUngroupFixture(): EditorDocument {
  const document = createCrossParentFixture()
  document.shapes.push({
    id: 'group-temp',
    type: 'group',
    name: 'Temp',
    parentId: 'group-root',
    childIds: ['rect-a', 'rect-c'],
    x: 0,
    y: 0,
    width: 400,
    height: 80,
  })
  document.shapes.find((shape) => shape.id === 'rect-a')!.parentId = 'group-temp'
  document.shapes.find((shape) => shape.id === 'rect-c')!.parentId = 'group-temp'
  document.shapes.find((shape) => shape.id === 'group-left')!.childIds = ['rect-b']
  document.shapes.find((shape) => shape.id === 'group-right')!.childIds = ['rect-d']
  document.shapes.find((shape) => shape.id === 'group-root')!.childIds = ['group-left', 'group-temp', 'group-right']
  return document
}

/**
 * Creates one mask-linked fixture where host/source live under the same parent for reorder and regroup parity checks.
 */
export function createMaskLinkedFixture(): EditorDocument {
  return {
    id: 'doc-mask-linked',
    name: 'mask linked fixture',
    width: 1200,
    height: 800,
    shapes: [
      {
        id: 'group-root',
        type: 'group',
        name: 'Root',
        parentId: null,
        childIds: ['mask-source', 'image-host', 'rect-a', 'rect-b'],
        x: 0,
        y: 0,
        width: 600,
        height: 240,
      },
      {
        id: 'mask-source',
        type: 'rectangle',
        name: 'Mask Source',
        parentId: 'group-root',
        x: 0,
        y: 0,
        width: 120,
        height: 120,
        schema: {
          sourceNodeType: 'rectangle',
          sourceNodeKind: 'shape',
          sourceFeatureKinds: ['mask'],
          maskGroupId: 'mask-group:image-host:mask-source',
          maskRole: 'source',
        },
      },
      {
        id: 'image-host',
        type: 'image',
        name: 'Image Host',
        parentId: 'group-root',
        x: 20,
        y: 20,
        width: 120,
        height: 120,
        clipPathId: 'mask-source',
        schema: {
          sourceNodeType: 'image',
          sourceNodeKind: 'shape',
          sourceFeatureKinds: ['mask'],
          maskGroupId: 'mask-group:image-host:mask-source',
          maskRole: 'host',
        },
      },
      {
        id: 'rect-a',
        type: 'rectangle',
        name: 'Rect A',
        parentId: 'group-root',
        x: 180,
        y: 10,
        width: 80,
        height: 80,
      },
      {
        id: 'rect-b',
        type: 'rectangle',
        name: 'Rect B',
        parentId: 'group-root',
        x: 300,
        y: 10,
        width: 80,
        height: 80,
      },
    ],
  }
}

/**
 * Creates one grouped mask fixture used to validate ungroup parity with mask-linked children.
 */
export function createMaskLinkedGroupedFixture(): EditorDocument {
  return {
    id: 'doc-mask-grouped',
    name: 'mask grouped fixture',
    width: 1200,
    height: 800,
    shapes: [
      {
        id: 'group-root',
        type: 'group',
        name: 'Root',
        parentId: null,
        childIds: ['group-mask', 'rect-b'],
        x: 0,
        y: 0,
        width: 600,
        height: 240,
      },
      {
        id: 'group-mask',
        type: 'group',
        name: 'Mask Group',
        parentId: 'group-root',
        childIds: ['mask-source', 'image-host', 'rect-a'],
        x: 0,
        y: 0,
        width: 300,
        height: 200,
      },
      {
        id: 'mask-source',
        type: 'rectangle',
        name: 'Mask Source',
        parentId: 'group-mask',
        x: 0,
        y: 0,
        width: 120,
        height: 120,
        schema: {
          sourceNodeType: 'rectangle',
          sourceNodeKind: 'shape',
          sourceFeatureKinds: ['mask'],
          maskGroupId: 'mask-group:image-host:mask-source',
          maskRole: 'source',
        },
      },
      {
        id: 'image-host',
        type: 'image',
        name: 'Image Host',
        parentId: 'group-mask',
        x: 20,
        y: 20,
        width: 120,
        height: 120,
        clipPathId: 'mask-source',
        schema: {
          sourceNodeType: 'image',
          sourceNodeKind: 'shape',
          sourceFeatureKinds: ['mask'],
          maskGroupId: 'mask-group:image-host:mask-source',
          maskRole: 'host',
        },
      },
      {
        id: 'rect-a',
        type: 'rectangle',
        name: 'Rect A',
        parentId: 'group-mask',
        x: 180,
        y: 10,
        width: 80,
        height: 80,
      },
      {
        id: 'rect-b',
        type: 'rectangle',
        name: 'Rect B',
        parentId: 'group-root',
        x: 340,
        y: 10,
        width: 80,
        height: 80,
      },
    ],
  }
}
