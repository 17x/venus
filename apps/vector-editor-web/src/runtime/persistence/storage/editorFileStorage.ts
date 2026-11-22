import type {EditorFileAsset, EditorFileDocument} from '../../types/index.ts'

/** Serializable asset metadata stored with a document snapshot. */
export type StoredEditorFileAsset = Omit<
  EditorFileAsset,
  'file' | 'imageRef' | 'objectUrl'
> & {
  embeddedDataUrl?: string
}

/** Browser-independent document payload stored in the documents object store. */
export type StoredEditorFileDocument = Omit<EditorFileDocument, 'assets'> & {
  assets: StoredEditorFileAsset[]
}

/** Binary asset record stored separately from the document JSON payload. */
export interface StoredEditorAssetBlob {
  key: string
  documentId: string
  assetId: string
  name: string
  type: string
  mimeType: string
  blob: Blob
}

/** Removes session-only browser handles before local persistence. */
export function serializeEditorFileForStorage(
  file: EditorFileDocument,
): StoredEditorFileDocument {
  return {
    ...file,
    assets: (file.assets ?? []).map((asset) => ({
      id: asset.id,
      name: asset.name,
      type: asset.type,
      mimeType: asset.mimeType,
      embeddedDataUrl: asset.objectUrl?.startsWith('data:')
        ? asset.objectUrl
        : undefined,
    })),
  }
}

/** Extracts cloneable binary records for the IndexedDB asset store. */
export function createStoredAssetBlobs(
  documentId: string,
  assets: readonly EditorFileAsset[],
): StoredEditorAssetBlob[] {
  return assets.flatMap((asset) => {
    if (!asset.file) {
      return []
    }

    return [{
      key: createAssetStorageKey(documentId, asset.id),
      documentId,
      assetId: asset.id,
      name: asset.name,
      type: asset.type,
      mimeType: asset.mimeType,
      blob: asset.file,
    }]
  })
}

/** Recreates session-only object URLs and image handles after local restore. */
export async function hydrateEditorFileFromStorage(
  stored: StoredEditorFileDocument,
  blobs: readonly StoredEditorAssetBlob[],
): Promise<EditorFileDocument> {
  const blobByAssetId = new Map(blobs.map((record) => [record.assetId, record]))
  const assets = await Promise.all(stored.assets.map(async (asset): Promise<EditorFileAsset> => {
    const record = blobByAssetId.get(asset.id)
    if (!record) {
      return {
        id: asset.id,
        name: asset.name,
        type: asset.type,
        mimeType: asset.mimeType,
        objectUrl: asset.embeddedDataUrl,
      }
    }

    const file = new File([record.blob], record.name, {type: record.mimeType})
    const objectUrl = URL.createObjectURL(file)
    const imageRef = record.type === 'image'
      ? await loadImageHandle(objectUrl)
      : undefined

    return {
      id: asset.id,
      name: record.name,
      type: record.type,
      mimeType: record.mimeType,
      file,
      objectUrl,
      imageRef,
    }
  }))

  return {
    ...stored,
    assets,
  }
}

/** Releases object URLs owned by a restored or imported editor session. */
export function releaseEditorFileObjectUrls(file: EditorFileDocument | null): void {
  file?.assets?.forEach((asset) => {
    if (asset.objectUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(asset.objectUrl)
    }
  })
}

export function createAssetStorageKey(documentId: string, assetId: string): string {
  return `${documentId}:${assetId}`
}

function loadImageHandle(objectUrl: string): Promise<HTMLImageElement | undefined> {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => resolve(undefined)
    image.src = objectUrl
  })
}
