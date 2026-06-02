import type {PlaygroundSceneSnapshot} from '../../types/playgroundScene'

const SCENE_WIDTH = 1920
const SCENE_HEIGHT = 1180
const GRID_ONLY_DEBUG_MODE = true
type GridSceneNode = {id: string; [key: string]: unknown}

function createGridStripNode(input: {
  id: string
  x: number
  y: number
  width: number
  height: number
  z: number
  color: string
}): GridSceneNode {
  const width = Math.max(1, input.width)
  const height = Math.max(1, input.height)
  return {
    id: input.id,
    type: 'shape',
    shape: 'rect',
    x: input.x,
    y: input.y,
    width,
    height,
    fill: input.color,
    stroke: input.color,
    strokeWidth: 0,
    renderOrder: 40,
    z: input.z,
    visible: true,
    lightingMode: 'unlit',
    materialId: 'ground-grid-material',
    semantic3d: {
      bounds: {x: input.x, y: input.y, z: input.z, width, height, depth: 2},
      transform: {
        x: input.x,
        y: input.y,
        z: input.z,
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
        scaleX: 1,
        scaleY: 1,
        scaleZ: 1,
      },
      sourceType: 'shape',
      renderOrder: 40,
      visible: true,
      lightingMode: 'unlit',
      materialId: 'ground-grid-material',
    },
  }
}

/**
 * Build one grid/axis-focused 3D editor validation scene.
 * This temporary mode isolates ground-grid stability under zoom/orbit interactions.
 */
export const build3DEditorValidationScene = (revision: number): PlaygroundSceneSnapshot => {
  const nodes: PlaygroundSceneSnapshot['nodes'] = [
    {
      id: 'editor-bg',
      type: 'shape',
      shape: 'rect',
      x: 20,
      y: 20,
      width: SCENE_WIDTH - 40,
      height: SCENE_HEIGHT - 40,
      cornerRadius: 24,
      fill: '#0f172a',
      stroke: '#334155',
      strokeWidth: 2,
    },
    {
      id: 'editor-title',
      type: 'text',
      x: 56,
      y: 60,
      text: 'Scenario: 3D Editor Grid/Axes Stability Validation',
      style: {
        fontFamily: 'IBM Plex Sans',
        fontSize: 30,
        fontWeight: 600,
        fill: '#e2e8f0',
      },
    },
    {
      id: 'editor-subtitle',
      type: 'text',
      x: 56,
      y: 102,
      text: 'Grid-only debug mode for zoom in/out rendering consistency checks',
      style: {
        fontFamily: 'IBM Plex Sans',
        fontSize: 15,
        fill: '#93c5fd',
      },
    },
    {
      id: 'viewport-frame',
      type: 'shape',
      shape: 'rect',
      x: 352,
      y: 154,
      width: 1200,
      height: 960,
      cornerRadius: 18,
      fill: '#020617',
      stroke: '#3b82f6',
      strokeWidth: 2,
    },
    {
      id: 'object-ground',
      type: 'shape',
      shape: 'rect',
      x: 560,
      y: 760,
      width: 740,
      height: 118,
      fill: '#172554',
      stroke: '#60a5fa',
      strokeWidth: 2,
      renderOrder: 30,
      z: 30,
      visible: true,
      lightingMode: 'lit',
      materialId: 'ground-material',
      semantic3d: {
        bounds: {x: 560, y: 760, z: 30, width: 740, height: 118, depth: 18},
        transform: {x: 560, y: 760, z: 30, rotationX: 0, rotationY: 0, rotationZ: 0, scaleX: 1, scaleY: 1, scaleZ: 1},
        sourceType: 'shape',
        renderOrder: 30,
        visible: true,
        lightingMode: 'lit',
        materialId: 'ground-material',
      },
    },
  ]

  const groundTopLeftX = 560
  const groundTopLeftY = 760
  const groundWidth = 740
  const groundHeight = 118
  const gridInset = 14
  const gridStep = 38
  const gridZ = 31

  nodes.push(
    createGridStripNode({
      id: 'ground-axis-x',
      x: groundTopLeftX + gridInset,
      y: groundTopLeftY + Math.floor(groundHeight / 2),
      width: groundWidth - gridInset * 2,
      height: 2,
      z: gridZ + 1,
      color: '#64748b',
    }),
    createGridStripNode({
      id: 'ground-axis-z',
      x: groundTopLeftX + Math.floor(groundWidth / 2),
      y: groundTopLeftY + gridInset,
      width: 2,
      height: groundHeight - gridInset * 2,
      z: gridZ + 1,
      color: '#94a3b8',
    }),
  )

  for (let x = groundTopLeftX + gridInset; x <= groundTopLeftX + groundWidth - gridInset; x += gridStep) {
    nodes.push(
      createGridStripNode({
        id: `ground-grid-v-${x}`,
        x,
        y: groundTopLeftY + gridInset,
        width: 1,
        height: groundHeight - gridInset * 2,
        z: gridZ,
        color: '#3b4f79',
      }),
    )
  }

  for (let y = groundTopLeftY + gridInset; y <= groundTopLeftY + groundHeight - gridInset; y += gridStep) {
    nodes.push(
      createGridStripNode({
        id: `ground-grid-h-${y}`,
        x: groundTopLeftX + gridInset,
        y,
        width: groundWidth - gridInset * 2,
        height: 1,
        z: gridZ,
        color: '#3b4f79',
      }),
    )
  }

  if (!GRID_ONLY_DEBUG_MODE) {
    // Reserved for restoring full object/hit-testing fixture after grid stability validation closes.
  }

  return {
    revision,
    width: SCENE_WIDTH,
    height: SCENE_HEIGHT,
    nodes,
  }
}
