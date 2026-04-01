import JSZip from 'jszip'
import {VisionFileType} from '../../hooks/useEditorRuntime.ts'
import {waitImageSize} from '../../utilities/readImageHelper.ts'

const normalizeFile = (fileJson: any): VisionFileType => {
  if (Array.isArray(fileJson.workspace)) {
    const workspace = fileJson.workspace[0] || {}

    return {
      id: fileJson.id,
      name: fileJson.name,
      version: fileJson.version,
      createdAt: fileJson.createdAt,
      updatedAt: fileJson.updatedAt,
      config: fileJson.config,
      elements: workspace.elements || [],
      assets: workspace.assets || [],
    }
  }

  return {
    ...fileJson,
    elements: fileJson.elements || [],
    assets: fileJson.assets || [],
  }
}

const readFileHelper = (file: File): Promise<VisionFileType> => {
  return new Promise(async (resolve, reject) => {
    try {
      const newZip = new JSZip()
      const loadedFile = await newZip.loadAsync(file)
      const loadedJson = JSON.parse(await loadedFile.files['file.json'].async('text'))
      const fileJson = normalizeFile(loadedJson)
      const promises = (fileJson.assets || []).map(async asset => {
        const fileKey = 'assets/' + asset.id
        const assetEntry = loadedFile.files[fileKey]

        if (!assetEntry) return

        const fileName = asset.name
        const assetBlob = await assetEntry.async('blob')
        const nextFile = new File([assetBlob], fileName, {type: asset.mimeType})

        if (asset.type === 'image') {
          asset.imageRef = await waitImageSize(nextFile)
        }

        asset.file = nextFile
      })

      await Promise.all(promises)
      resolve(fileJson)
    } catch (e) {
      reject(e)
    }
  })
}
export default readFileHelper
