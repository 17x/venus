import {nid} from '@vector/model'
import type {VisionFileAsset} from '../../editor/hooks/useEditorRuntime.types.ts'

const readImageHelper = (file: File): Promise<VisionFileAsset> => {
  return new Promise<VisionFileAsset>(async (resolve, reject) => {
    try {
      let mimeType = file.type

      resolve({
        id: nid(),
        type: 'image',
        file,
        mimeType,
        imageRef: await waitImageSize(file),
        objectUrl: URL.createObjectURL(file),
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
