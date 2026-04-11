export type Canvas2DLodLevel = 0 | 1 | 2 | 3

export interface Canvas2DTextLodConfig {
  minScaleForContentByLevel: Record<Canvas2DLodLevel, number>
}

export interface Canvas2DShapeLodConfig {
  minRenderedExtentToDrawByLevel: Record<Canvas2DLodLevel, number>
}

export interface Canvas2DImageLodConfig {
  smoothingByLevel: Record<Canvas2DLodLevel, ImageSmoothingQuality>
  minRenderedSizeForPlaceholderLabel: {
    width: number
    height: number
  }
  minRenderedExtentToDrawByLevel: Record<Canvas2DLodLevel, number>
}

export interface Canvas2DPathLodConfig {
  fallbackCurveStepsByLevel: Record<Canvas2DLodLevel, number>
  minRenderedLengthToDrawByLevel: Record<Canvas2DLodLevel, number>
}

export interface Canvas2DLodConfig {
  shape: Canvas2DShapeLodConfig
  text: Canvas2DTextLodConfig
  image: Canvas2DImageLodConfig
  path: Canvas2DPathLodConfig
}

export const defaultCanvas2DLodConfig: Canvas2DLodConfig = {
  shape: {
    minRenderedExtentToDrawByLevel: {
      0: 0,
      1: 0.5,
      2: 1,
      3: 2,
    },
  },
  text: {
    minScaleForContentByLevel: {
      0: 0,
      1: 0.2,
      2: 0.45,
      3: 0.7,
    },
  },
  image: {
    smoothingByLevel: {
      0: 'high',
      1: 'medium',
      2: 'low',
      3: 'low',
    },
    minRenderedSizeForPlaceholderLabel: {
      width: 72,
      height: 48,
    },
    minRenderedExtentToDrawByLevel: {
      0: 0,
      1: 1,
      2: 2,
      3: 4,
    },
  },
  path: {
    fallbackCurveStepsByLevel: {
      0: 24,
      1: 20,
      2: 16,
      3: 12,
    },
    minRenderedLengthToDrawByLevel: {
      0: 0,
      1: 1,
      2: 2,
      3: 4,
    },
  },
}

export const performanceCanvas2DLodConfig: Canvas2DLodConfig = {
  shape: {
    minRenderedExtentToDrawByLevel: {
      0: 0.5,
      1: 1,
      2: 2,
      3: 3,
    },
  },
  text: {
    minScaleForContentByLevel: {
      0: 0.15,
      1: 0.45,
      2: 0.7,
      3: 0.9,
    },
  },
  image: {
    smoothingByLevel: {
      0: 'medium',
      1: 'medium',
      2: 'low',
      3: 'low',
    },
    minRenderedSizeForPlaceholderLabel: {
      width: 96,
      height: 64,
    },
    minRenderedExtentToDrawByLevel: {
      0: 1,
      1: 2,
      2: 3,
      3: 5,
    },
  },
  path: {
    fallbackCurveStepsByLevel: {
      0: 12,
      1: 10,
      2: 8,
      3: 6,
    },
    minRenderedLengthToDrawByLevel: {
      0: 1,
      1: 2,
      2: 3,
      3: 5,
    },
  },
}

export const imageHeavyCanvas2DLodConfig: Canvas2DLodConfig = {
  shape: {
    minRenderedExtentToDrawByLevel: {
      0: 0.5,
      1: 1,
      2: 1.5,
      3: 2.5,
    },
  },
  text: {
    minScaleForContentByLevel: {
      0: 0.1,
      1: 0.3,
      2: 0.55,
      3: 0.8,
    },
  },
  image: {
    smoothingByLevel: {
      0: 'medium',
      1: 'medium',
      2: 'low',
      3: 'low',
    },
    minRenderedSizeForPlaceholderLabel: {
      width: 88,
      height: 56,
    },
    minRenderedExtentToDrawByLevel: {
      0: 1,
      1: 2,
      2: 3,
      3: 5,
    },
  },
  path: {
    fallbackCurveStepsByLevel: {
      0: 16,
      1: 14,
      2: 12,
      3: 8,
    },
    minRenderedLengthToDrawByLevel: {
      0: 1,
      1: 2,
      2: 3,
      3: 5,
    },
  },
}

export function resolveShowTextContent(
  viewportScale: number,
  lodLevel: Canvas2DLodLevel,
  lodConfig: Canvas2DLodConfig,
) {
  return viewportScale >= lodConfig.text.minScaleForContentByLevel[lodLevel]
}

export function resolveImageSmoothingQuality(
  lodLevel: Canvas2DLodLevel,
  lodConfig: Canvas2DLodConfig,
) {
  return lodConfig.image.smoothingByLevel[lodLevel]
}

export function resolvePathFallbackCurveSteps(
  lodLevel: Canvas2DLodLevel,
  lodConfig: Canvas2DLodConfig,
) {
  return lodConfig.path.fallbackCurveStepsByLevel[lodLevel]
}

export function resolveShapeMinRenderedExtentToDraw(
  lodLevel: Canvas2DLodLevel,
  lodConfig: Canvas2DLodConfig,
) {
  return lodConfig.shape.minRenderedExtentToDrawByLevel[lodLevel]
}

export function resolveImageMinRenderedExtentToDraw(
  lodLevel: Canvas2DLodLevel,
  lodConfig: Canvas2DLodConfig,
) {
  return lodConfig.image.minRenderedExtentToDrawByLevel[lodLevel]
}

export function resolvePathMinRenderedLengthToDraw(
  lodLevel: Canvas2DLodLevel,
  lodConfig: Canvas2DLodConfig,
) {
  return lodConfig.path.minRenderedLengthToDrawByLevel[lodLevel]
}
