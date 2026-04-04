import type { CanvasRendererProps } from '@venus/canvas-base'

export interface Canvas2DTextLodConfig {
  minScaleForContent: {
    full: number
    interactive: number
  }
}

export interface Canvas2DImageLodConfig {
  smoothing: {
    full: ImageSmoothingQuality
    interactive: ImageSmoothingQuality
  }
  minRenderedSizeForPlaceholderLabel: {
    width: number
    height: number
  }
}

export interface Canvas2DPathLodConfig {
  fallbackCurveSteps: number
}

export interface Canvas2DLodConfig {
  text: Canvas2DTextLodConfig
  image: Canvas2DImageLodConfig
  path: Canvas2DPathLodConfig
}

export const defaultCanvas2DLodConfig: Canvas2DLodConfig = {
  text: {
    minScaleForContent: {
      full: 0,
      interactive: 0.45,
    },
  },
  image: {
    smoothing: {
      full: 'high',
      interactive: 'low',
    },
    minRenderedSizeForPlaceholderLabel: {
      width: 72,
      height: 48,
    },
  },
  path: {
    fallbackCurveSteps: 24,
  },
}

export const performanceCanvas2DLodConfig: Canvas2DLodConfig = {
  text: {
    minScaleForContent: {
      full: 0.15,
      interactive: 0.7,
    },
  },
  image: {
    smoothing: {
      full: 'medium',
      interactive: 'low',
    },
    minRenderedSizeForPlaceholderLabel: {
      width: 96,
      height: 64,
    },
  },
  path: {
    fallbackCurveSteps: 12,
  },
}

export const imageHeavyCanvas2DLodConfig: Canvas2DLodConfig = {
  text: {
    minScaleForContent: {
      full: 0.1,
      interactive: 0.55,
    },
  },
  image: {
    smoothing: {
      full: 'medium',
      interactive: 'low',
    },
    minRenderedSizeForPlaceholderLabel: {
      width: 88,
      height: 56,
    },
  },
  path: {
    fallbackCurveSteps: 16,
  },
}

export function resolveShowTextContent(
  viewportScale: number,
  renderQuality: NonNullable<CanvasRendererProps['renderQuality']>,
  lodConfig: Canvas2DLodConfig,
) {
  const minScale = renderQuality === 'full'
    ? lodConfig.text.minScaleForContent.full
    : lodConfig.text.minScaleForContent.interactive

  return viewportScale >= minScale
}

export function resolveImageSmoothingQuality(
  renderQuality: NonNullable<CanvasRendererProps['renderQuality']>,
  lodConfig: Canvas2DLodConfig,
) {
  return renderQuality === 'full'
    ? lodConfig.image.smoothing.full
    : lodConfig.image.smoothing.interactive
}
