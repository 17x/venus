import {VisionEditorAssetType} from '~/services/assets/asssetsManager'
import Editor from '~/main/editor'

class AssetsManager {
  assetsMap: Map<string, VisionEditorAssetType> = new Map()
  editor: Editor

  constructor(editor: Editor, assets: VisionEditorAssetType[] = []) {
    this.editor = editor
    assets.forEach(asset => this.add(asset))
  }

  getAssetsObj(id: string): VisionEditorAssetType | false {
    return this.assetsMap.get(id) || false
  }

  add(asset: VisionEditorAssetType) {
    this.assetsMap.set(asset.id, asset)
  }

  /*  static async resolve(file: File): Promise<AssetsObj> {
      return new Promise<AssetsObj>(async (resolve, reject) => {

        if (!file) {
          reject('File error')
        }

        if (!file!.type.startsWith('image/')) {
          reject('File format error')
        }

        const imageRef = await waitImageSize(file)

        resolve({
          id: nid(),
          type: 'image',
          file,
          imageRef,
          name: file.name,
        })

      })
    }*/

  destroy() {
    this.assetsMap.forEach((asset) => {
      // do sth
      if (asset.type === 'image') {
        URL.revokeObjectURL(asset.imageRef!.src)
      }
    })
  }
}

export default AssetsManager
