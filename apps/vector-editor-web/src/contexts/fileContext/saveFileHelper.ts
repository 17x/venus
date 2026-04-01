import JSZip from 'jszip'
import {VisionFileType, VisionWorkspace} from '../appContext/AppContext.tsx'

const saveFileHelper = (file: VisionFileType, workspaces: VisionWorkspace[]) => {
  const zip = new JSZip()
  const assetsFolder = zip!.folder('assets')

  const newWorkspace = workspaces.map(ws => {
    return {
      ...ws,
      assets: ws.assets!.map(asset => {
        assetsFolder!.file(asset.id, asset.file)

        return {
          id: asset.id,
          name: asset.name,
          type: asset.type,
          mimeType: asset.mimeType,
        }
      }),
    }
  })

  const fileJson = {
    ...file,
    workspace: newWorkspace,
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