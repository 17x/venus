import {nid} from '@lite-u/editor'
import {VisionEditorAssetType} from '@lite-u/editor/types'

const readImageHelper = (file: File): Promise<VisionEditorAssetType> => {
  return new Promise<VisionEditorAssetType>(async (resolve, reject) => {
    try {
      let mimeType = file.type

      resolve({
        id: nid(),
        type: 'image',
        file,
        mimeType,
        imageRef: await waitImageSize(file),
        name: file.name,
      })
    } catch (error) {
      reject(error)
    }
  })
}

export async function waitImageSize(file: File) {
  return new Promise<any>((resolve, reject) => {
    const imageRef = new Image()

    imageRef.onload = () => {
      resolve(imageRef)
    }

    imageRef.onerror = () => {
      reject('Load image size error')
    }

    imageRef.src = URL.createObjectURL(file)
  })
}

export default readImageHelper