/**
 * Leaf element builder helpers for the feature-matrix template.
 *
 * Two exported builders cover the leaf nodes of the matrix scene:
 *   -  rect / ellipse / polygon / star / line / pathbuildMatrixBasicShapes  
 *   -  text-runs / mask / clip / imagebuildMatrixRichElements 
 *
 * Frame/group structure and overlay-lane builders live in generators.matrix.ts
 * to keep this file within governance line limits.
 */
import type {EditorFileAsset} from '../../types/index.ts'
import type {ElementProps} from '../../types/index.ts'

// ---------------------------------------------------------------------------
// Basic shapes (primitive leaf elements)
// ---------------------------------------------------------------------------

/**
 * Builds the basic-shape leaf elements: rect-gradient, ellipse-arc, polygon,
 * star, line-arrowheads, bezier-path, and closed path-outline.
 * @param leafParentId ID of the deepest depth-group that owns these elements.
 */
export function buildMatrixBasicShapes(leafParentId: string): ElementProps[] {
  const elements: ElementProps[] = []

  elements.push({
    id: 'matrix-rect-main',
    type: 'rectangle',
    name: 'Rectangle Gradient + Stroke Gradient',
    x: 280,
    y: 230,
    width: 290,
    height: 184,
    parentId: leafParentId,
    rotation: 8,
    fill: {
      enabled: true,
      color: '#e0f2fe',
      gradient: {
        type: 'linear',
        angle: 132,
        stops: [
          {offset: 0, color: '#dbeafe'},
          {offset: 0.55, color: '#bfdbfe'},
          {offset: 1, color: '#93c5fd'},
        ],
      },
    },
    stroke: {
      enabled: true,
      color: '#1d4ed8',
      weight: 3,
      gradient: {
        type: 'linear',
        angle: 90,
        stops: [
          {offset: 0, color: '#1d4ed8'},
          {offset: 1, color: '#1e40af'},
        ],
      },
    },
    shadow: {
      enabled: true,
      color: 'rgba(30,64,175,0.24)',
      offsetX: 0,
      offsetY: 10,
      blur: 20,
    },
    cornerRadii: {
      topLeft: 22,
      topRight: 8,
      bottomRight: 22,
      bottomLeft: 8,
    },
    extensions: {
      matrix: {
        interactionState: 'selected',
        handles: ['nw', 'ne', 'se', 'sw', 'rotate'],
        cursor: 'nwse-resize',
      },
    },
  })

  elements.push({
    id: 'matrix-ellipse-arc',
    type: 'ellipse',
    name: 'Ellipse Arc + Flip',
    x: 642,
    y: 240,
    width: 188,
    height: 150,
    parentId: leafParentId,
    flipX: true,
    ellipseStartAngle: 36,
    ellipseEndAngle: 312,
    fill: {
      enabled: true,
      color: '#fef3c7',
      gradient: {
        type: 'radial',
        centerX: 0.45,
        centerY: 0.4,
        radius: 0.8,
        stops: [
          {offset: 0, color: '#fef9c3'},
          {offset: 1, color: '#f59e0b'},
        ],
      },
    },
    stroke: {
      enabled: true,
      color: '#92400e',
      weight: 2,
    },
    extensions: {
      matrix: {
        interactionState: 'hover',
        cursor: 'pointer',
      },
    },
  })

  elements.push({
    id: 'matrix-polygon',
    type: 'polygon',
    name: 'Polygon Rotated',
    x: 866,
    y: 244,
    width: 206,
    height: 164,
    parentId: leafParentId,
    rotation: -12,
    points: [
      {x: 930, y: 244},
      {x: 1066, y: 286},
      {x: 1032, y: 408},
      {x: 892, y: 402},
      {x: 866, y: 302},
    ],
    fill: {
      enabled: true,
      color: '#ede9fe',
    },
    stroke: {
      enabled: true,
      color: '#5b21b6',
      weight: 2,
    },
  })

  elements.push({
    id: 'matrix-star',
    type: 'star',
    name: 'Star Shape',
    x: 1110,
    y: 256,
    width: 132,
    height: 132,
    parentId: leafParentId,
    points: [
      {x: 1176, y: 256},
      {x: 1194, y: 302},
      {x: 1242, y: 306},
      {x: 1204, y: 336},
      {x: 1218, y: 388},
      {x: 1176, y: 360},
      {x: 1134, y: 388},
      {x: 1148, y: 336},
      {x: 1110, y: 306},
      {x: 1158, y: 302},
    ],
    fill: {
      enabled: true,
      color: '#fde68a',
    },
    stroke: {
      enabled: true,
      color: '#a16207',
      weight: 2,
    },
  })

  elements.push({
    id: 'matrix-line',
    type: 'lineSegment',
    name: 'Line Segment Arrowheads',
    x: 294,
    y: 484,
    width: 302,
    height: 118,
    parentId: leafParentId,
    points: [
      {x: 294, y: 484},
      {x: 596, y: 602},
    ],
    strokeStartArrowhead: 'circle',
    strokeEndArrowhead: 'triangle',
    fill: {
      enabled: false,
      color: '#00000000',
    },
    stroke: {
      enabled: true,
      color: '#0f172a',
      weight: 4,
    },
    extensions: {
      matrix: {
        interactionState: 'handles',
        cursor: 'crosshair',
      },
    },
  })

  elements.push({
    id: 'matrix-path-curve',
    type: 'path',
    name: 'Bezier Path Multi Segment',
    x: 632,
    y: 462,
    width: 438,
    height: 198,
    parentId: leafParentId,
    points: [
      {x: 646, y: 540},
      {x: 768, y: 468},
      {x: 920, y: 622},
      {x: 1052, y: 496},
    ],
    bezierPoints: [
      {
        anchor: {x: 646, y: 540},
        cp2: {x: 704, y: 470},
      },
      {
        anchor: {x: 768, y: 468},
        cp1: {x: 730, y: 470},
        cp2: {x: 850, y: 478},
      },
      {
        anchor: {x: 920, y: 622},
        cp1: {x: 874, y: 652},
        cp2: {x: 978, y: 590},
      },
      {
        anchor: {x: 1052, y: 496},
        cp1: {x: 1010, y: 462},
      },
    ],
    strokeStartArrowhead: 'none',
    strokeEndArrowhead: 'diamond',
    fill: {
      enabled: false,
      color: '#00000000',
    },
    stroke: {
      enabled: true,
      color: '#0f766e',
      weight: 3,
    },
  })

  elements.push({
    id: 'matrix-path-outline',
    type: 'path',
    name: 'Closed Path Outline',
    x: 1112,
    y: 466,
    width: 198,
    height: 170,
    parentId: leafParentId,
    points: [
      {x: 1112, y: 466},
      {x: 1310, y: 486},
      {x: 1276, y: 636},
      {x: 1138, y: 620},
      {x: 1112, y: 466},
    ],
    fill: {
      enabled: true,
      color: 'rgba(56,189,248,0.16)',
    },
    stroke: {
      enabled: true,
      color: '#0284c7',
      weight: 2,
      dashed: true,
    },
  })

  return elements
}

// ---------------------------------------------------------------------------
// Rich elements (text / mask / clip / image)
// ---------------------------------------------------------------------------

/**
 * Builds the rich leaf elements: rich-text-runs, mask-source path,
 * masked-host image, and plain control image.
 * @param assets Asset pool produced by createImageAssetPool('matrix', 8).
 * @param leafParentId ID of the deepest depth-group that owns these elements.
 */
export function buildMatrixRichElements(
  assets: EditorFileAsset[],
  leafParentId: string,
): ElementProps[] {
  const elements: ElementProps[] = []

  elements.push({
    id: 'matrix-text-rich',
    type: 'text',
    name: 'Rich Text Matrix',
    text: 'Feature Matrix\nHover Marquee Selected\nHandles Cursor Sync',
    x: 284,
    y: 662,
    width: 520,
    height: 166,
    parentId: leafParentId,
    fill: {
      enabled: true,
      color: '#111827',
    },
    textRuns: [
      {
        start: 0,
        end: 14,
        style: {
          color: '#0f172a',
          fontFamily: 'Arial, sans-serif',
          fontSize: 30,
          fontWeight: 700,
          lineHeight: 36,
          letterSpacing: -0.2,
          shadow: {
            color: 'rgba(30,64,175,0.30)',
            offsetX: 1,
            offsetY: 2,
            blur: 4,
          },
        },
      },
      {
        start: 15,
        end: 39,
        style: {
          color: '#0369a1',
          fontFamily: 'Arial, sans-serif',
          fontSize: 22,
          fontWeight: 600,
          lineHeight: 30,
        },
      },
      {
        start: 40,
        end: 59,
        style: {
          color: '#0f766e',
          fontFamily: 'Arial, sans-serif',
          fontSize: 20,
          fontWeight: 500,
          lineHeight: 28,
          paragraphIndentFirst: 12,
          paragraphSpaceBeforeLine: 4,
        },
      },
    ],
    extensions: {
      matrix: {
        interactionState: 'selected+hover',
        cursor: 'text',
      },
    },
  })

  elements.push({
    id: 'matrix-mask-source',
    type: 'path',
    name: 'Mask Source Path',
    x: 866,
    y: 694,
    width: 278,
    height: 194,
    parentId: leafParentId,
    points: [
      {x: 930, y: 694},
      {x: 1144, y: 736},
      {x: 1108, y: 878},
      {x: 906, y: 888},
      {x: 866, y: 772},
      {x: 930, y: 694},
    ],
    fill: {
      enabled: true,
      color: '#e2e8f0',
    },
    stroke: {
      enabled: true,
      color: '#64748b',
      weight: 2,
    },
    maskGroupId: 'matrix-mask-01',
    maskRole: 'source',
    extensions: {
      matrix: {
        role: 'mask-source',
      },
    },
  })

  elements.push({
    id: 'matrix-image-host',
    type: 'image',
    name: 'Masked Host Image',
    x: 842,
    y: 678,
    width: 332,
    height: 228,
    parentId: leafParentId,
    asset: assets[0]?.id,
    assetUrl: assets[0]?.objectUrl,
    clipPathId: 'matrix-mask-source',
    clipRule: 'evenodd',
    maskGroupId: 'matrix-mask-01',
    maskRole: 'host',
    fill: {
      enabled: false,
      color: '#ffffff',
    },
    stroke: {
      enabled: false,
      color: '#111827',
      weight: 0,
    },
    extensions: {
      matrix: {
        interactionState: 'hover',
        cursor: 'move',
      },
    },
  })

  elements.push({
    id: 'matrix-image-plain',
    type: 'image',
    name: 'Plain Image Control',
    x: 1206,
    y: 708,
    width: 214,
    height: 164,
    parentId: leafParentId,
    asset: assets[1]?.id,
    assetUrl: assets[1]?.objectUrl,
    shadow: {
      enabled: true,
      color: 'rgba(15,23,42,0.26)',
      offsetX: 0,
      offsetY: 6,
      blur: 12,
    },
    extensions: {
      matrix: {
        interactionState: 'cursor',
        cursor: 'grab',
      },
    },
  })

  return elements
}
