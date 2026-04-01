import JSZip from 'jszip'
import {VisionFileType} from '../appContext/AppContext.tsx'
import {waitImageSize} from '../../utilities/readImageHelper.ts'

const readFileHelper = (file: File): Promise<VisionFileType> => {
  return new Promise(async (resolve, reject) => {
    try {
      const newZip = new JSZip()
      const loadedFile = await newZip.loadAsync(file)
      const fileJson: VisionFileType = JSON.parse(await loadedFile.files['file.json'].async('text'))

      const promises = fileJson.workspace.map(async ws => {
        const promises = ws.assets!.map(async asset => {
          const fileKey = 'assets/' + asset.id
          const fileName = asset.name
          let assetBlob = await loadedFile.files[fileKey].async('blob')
          let file = new File([assetBlob], fileName, {type: asset.mimeType})

          if (asset.type === 'image') {
            asset.imageRef = await waitImageSize(file)
          }

          asset.file = file
        })

        await Promise.all(promises)
      })

      await Promise.all(promises)

      resolve(fileJson)
    } catch (e) {
      reject(e)
    }
  })
}
export default readFileHelper