import type {ElementProps} from './editorElement.ts'

// Declares one persisted binary/text asset referenced by a file document.
export interface EditorFileAsset {
  // Stores stable asset id used by element.asset references.
  id: string
  // Stores original display name for export/import surfaces.
  name: string
  // Stores logical asset category (for example: image).
  type: string
  // Stores MIME type used by zip import/export adapters.
  mimeType: string
  // Stores optional in-memory browser File for local session workflows.
  file?: File
  // Stores optional decoded image handle resolved during import.
  imageRef?: unknown
  // Stores optional object URL used by UI/runtime preview rendering.
  objectUrl?: string
}

// Declares file-level page geometry and unit configuration.
export interface EditorFilePageSpec {
  // Stores canonical unit label used by document config.
  unit: string
  // Stores page width in document unit space.
  width: number
  // Stores page height in document unit space.
  height: number
  // Stores document DPI metadata for export/import compatibility.
  dpi: number
}

// Declares persisted editor file schema used across app/runtime adapters.
export interface EditorFileDocument {
  // Stores unique file id.
  id: string
  // Stores file display name.
  name: string
  // Stores file format version string.
  version: string
  // Stores file creation timestamp.
  createdAt: number
  // Stores file update timestamp.
  updatedAt: number
  // Stores page/editor configuration payload.
  config: {
    // Stores page geometry metadata.
    page: EditorFilePageSpec
    // Stores optional editor-specific config payload.
    editor?: {}
  }
  // Stores persisted element payload list.
  elements: ElementProps[]
  // Stores optional persisted asset list.
  assets?: EditorFileAsset[]
}