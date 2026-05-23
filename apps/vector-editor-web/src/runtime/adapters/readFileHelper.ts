import JSZip from 'jszip'
import type {EditorFileDocument} from '../types/index.ts'
import {waitImageSize} from '../readImage.ts'
import {normalizeFile} from './readFileNormalize.ts'

const readFileHelper = (file: File): Promise<EditorFileDocument> => {
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
        const objectUrl = URL.createObjectURL(nextFile)

        if (asset.type === 'image') {
          asset.imageRef = await waitImageSize(nextFile)
        }

        asset.objectUrl = objectUrl
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
