import {evolveDocumentLifecycleState} from '../../runtime/model/document-runtime/index.ts'
import type {
  EditorFileDocument,
  EditorFileLifecycleDirtySource,
  EditorFileLifecycleState,
  EditorFileLifecycleTransitionSource,
} from '../../runtime/types/index.ts'

/**
 * Declares save-lifecycle context consumed by file save transition helper.
 */
export interface FileSaveLifecycleContext {
  /** Stores explicit transition source metadata for lifecycle observability. */
  transitionSource?: EditorFileLifecycleTransitionSource
  /** Stores latest dirty source chain derived from runtime command history. */
  dirtySource?: EditorFileLifecycleDirtySource
  /** Stores optional recovery reason used by recovery-only transitions. */
  recoveryReason?: string
}

/**
 * Resolves lifecycle transition when one file gets opened/created in session state.
 * @param file Source file payload.
 */
export function resolveLifecycleOnFileOpen(file: EditorFileDocument): EditorFileDocument['lifecycle'] {
  const shouldKeepRecovery = file.config.editor?.readOnly === true || file.lifecycle?.state === 'recovery'
  if (shouldKeepRecovery) {
    return evolveDocumentLifecycleState(
      file.lifecycle,
      'recovery',
      {
        source: {
          kind: 'import',
          event: 'file.open.recovery-preserved',
          issuedAt: Date.now(),
        },
        recoveryReason: file.lifecycle?.recoveryReason,
      },
    )
  }

  return evolveDocumentLifecycleState(file.lifecycle, 'opened', {
    source: {
      kind: 'user',
      event: 'file.open',
      issuedAt: Date.now(),
    },
  })
}

/**
 * Resolves lifecycle transition when one file is created in session state.
 * @param file Source file payload.
 */
export function resolveLifecycleOnFileCreate(file: EditorFileDocument): EditorFileDocument['lifecycle'] {
  return evolveDocumentLifecycleState(file.lifecycle, 'created', {
    source: {
      kind: 'user',
      event: 'file.create',
      issuedAt: Date.now(),
    },
  })
}

/**
 * Resolves lifecycle transition when one file snapshot is saved.
 * @param previous Previous lifecycle snapshot.
 * @param lifecycleContext Optional save context from product/runtime orchestration.
 */
export function resolveLifecycleOnFileSave(
  previous: EditorFileLifecycleState | undefined,
  lifecycleContext?: FileSaveLifecycleContext,
): EditorFileDocument['lifecycle'] {
  return evolveDocumentLifecycleState(previous, 'saved', {
    source: lifecycleContext?.transitionSource ?? {
      kind: 'user',
      event: 'file.save',
      issuedAt: Date.now(),
    },
    dirtySource: lifecycleContext?.dirtySource,
    recoveryReason: lifecycleContext?.recoveryReason,
  })
}
