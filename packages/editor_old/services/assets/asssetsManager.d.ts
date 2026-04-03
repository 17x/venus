export interface VisionEditorAssetType {
  id: string
  /**
   * Or something else
   */
  type: 'image'
  mimeType: string
  file: File
  name: string
  imageRef?: HTMLImageElement
}