// Module responsibility: user-facing graphics settings contract and validation.
// Non-responsibility: runtime policy resolution and device capability detection.

/**
 * Defines abstract anti-aliasing modes without exposing backend-specific details.
 */
export type EngineAntiAliasingMode = 'off' | 'fxaa' | 'msaa'

/**
 * Describes user-facing graphics settings normalized before runtime policy generation.
 */
export interface EngineGraphicsSettings {
  /** Scale multiplier for internal rendering resolution in range [0.5, 2]. */
  renderScale: number
  /** Maximum target frames per second in range [15, 240]. */
  maxFps: number
  /** Abstract anti-aliasing mode used by the runtime policy layer. */
  antiAliasing: EngineAntiAliasingMode
}

/**
 * Describes one schema validation issue for graphics settings input.
 */
export interface EngineGraphicsSettingsValidationIssue {
  /** Field name that failed validation. */
  field: keyof EngineGraphicsSettings
  /** Human-readable validation error message. */
  message: string
}

/**
 * Defines canonical defaults for graphics settings.
 */
export const DEFAULT_ENGINE_GRAPHICS_SETTINGS: EngineGraphicsSettings = {
  renderScale: 1,
  maxFps: 60,
  antiAliasing: 'fxaa',
}

/**
 * Intent: normalize partial graphics settings with deterministic defaults.
 * @param input Partial user input.
 * @returns Fully-resolved graphics settings object.
 */
export function resolveEngineGraphicsSettings(input?: Partial<EngineGraphicsSettings>): EngineGraphicsSettings {
  return {
    renderScale: input?.renderScale ?? DEFAULT_ENGINE_GRAPHICS_SETTINGS.renderScale,
    maxFps: input?.maxFps ?? DEFAULT_ENGINE_GRAPHICS_SETTINGS.maxFps,
    antiAliasing: input?.antiAliasing ?? DEFAULT_ENGINE_GRAPHICS_SETTINGS.antiAliasing,
  }
}

/**
 * Intent: validate graphics settings ranges before policy generation.
 * @param settings Resolved graphics settings input.
 * @returns Validation issue list; empty list means valid settings.
 */
export function validateEngineGraphicsSettings(settings: EngineGraphicsSettings): EngineGraphicsSettingsValidationIssue[] {
  const issues: EngineGraphicsSettingsValidationIssue[] = []

  if (!Number.isFinite(settings.renderScale) || settings.renderScale < 0.5 || settings.renderScale > 2) {
    issues.push({
      field: 'renderScale',
      message: 'renderScale must be a finite number in range [0.5, 2].',
    })
  }

  if (!Number.isFinite(settings.maxFps) || settings.maxFps < 15 || settings.maxFps > 240) {
    issues.push({
      field: 'maxFps',
      message: 'maxFps must be a finite number in range [15, 240].',
    })
  }

  return issues
}
