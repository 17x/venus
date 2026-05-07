import {nid} from './model/index.ts'
import type {EditorFileAsset} from './types/index.ts'

const readImageHelper = (file: File): Promise<EditorFileAsset> => {
  return new Promise<EditorFileAsset>(async (resolve, reject) => {
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
