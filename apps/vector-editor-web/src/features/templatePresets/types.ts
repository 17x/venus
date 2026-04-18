import type {VisionFileType} from '../../editor/hooks/useEditorRuntime.types.ts'

export type TemplatePresetCategory = 'simple-demo' | 'mixed-large' | 'image-heavy'

/** Scale label for quick filtering in test harnesses */
export type TemplateScaleTag = 'tiny' | 'small' | 'medium' | 'large' | 'extreme'

/** Capability area the template is designed to exercise */
export type TemplateCapabilityTag =
  | 'render'
  | 'hittest'
  | 'selection'
  | 'marquee'
  | 'snapping'
  | 'transform'
  | 'text'
  | 'image'
  | 'group'
  | 'overlap'
  | 'sparse'
  | 'mixed'
  | 'viewport'
  | 'import-export'

export interface TemplatePresetDefinition {
  id: string
  label: string
  description: string
  category: TemplatePresetCategory
  targetElementCount: number

  // --- Test metadata (optional, enriches template for test harnesses) ---
  /** Scale classification for quick filtering */
  scale?: TemplateScaleTag
  /** Capability areas this template exercises */
  capabilities?: TemplateCapabilityTag[]
  /** Interaction scenarios this template is suited for */
  interactionScenarios?: string[]
  /** Performance observations to watch for */
  performanceNotes?: string[]
  /** Whether this template is flagged for regression suites */
  regression?: boolean
  /** Whether this template is flagged for benchmark suites */
  benchmark?: boolean
}

export interface TemplateGeneratorContext {
  seed?: number
}

export type TemplateFileGenerator = (
  preset: TemplatePresetDefinition,
  context: TemplateGeneratorContext,
) => VisionFileType
