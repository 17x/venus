import JSZip from 'jszip'
import {VisionFileType} from '../../editor/hooks/useEditorRuntime.ts'

const saveFileHelper = (file: VisionFileType, exportedData?: Partial<VisionFileType>) => {
  const zip = new JSZip()
  const assetsFolder = zip!.folder('assets')
  const assets = exportedData?.assets ?? file.assets ?? []
  const fileJson = {
    ...file,
    ...exportedData,
    assets: assets.map(asset => {
      if (asset.file) {
        assetsFolder!.file(asset.id, asset.file)
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

  zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      mimeType: 'application/zip',
    },
  )
    .then(function (content) {
      console.log(content)

      const a = document.createElement('a')
      const url = URL.createObjectURL(content)
      a.href = url
      a.download = file.name + '.zip'
      a.click()
      URL.revokeObjectURL(url)
    })
}
export default saveFileHelper
