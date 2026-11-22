import JSZip from 'jszip'

import type {EditorFileDocument} from '../types/index.ts'

/** Exports a portable document archive without changing local autosave state. */
export async function exportDocumentArchive(
  file: EditorFileDocument,
  exportedData?: Partial<EditorFileDocument>,
): Promise<void> {
  const zip = new JSZip()
  const assetsFolder = zip.folder('assets')
  const assets = exportedData?.assets ?? file.assets ?? []
  const fileJson = {
    ...file,
    ...exportedData,
    assets: assets.map((asset) => {
      if (asset.file) {
        assetsFolder?.file(asset.id, asset.file)
      }

      return {
        id: asset.id,
        name: asset.name,
        type: asset.type,
        mimeType: asset.mimeType,
      }
    }),
  }

  zip.file('file.json', JSON.stringify(fileJson))
  const content = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    mimeType: 'application/zip',
  })
  const anchor = window.document.createElement('a')
  const url = URL.createObjectURL(content)
  anchor.href = url
  anchor.download = `${file.name}.zip`
  anchor.click()
  URL.revokeObjectURL(url)
}

export default exportDocumentArchive
