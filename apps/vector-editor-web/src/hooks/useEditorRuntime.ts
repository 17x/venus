import { useMemo } from 'react'
import { useCanvasRuntime } from '@venus/canvas-base'
import { createStarterDocument } from '../fixtures/createStarterDocument.ts'

// The starter app keeps a small fixed scene budget while the shared-memory
// layout is still evolving. App variants can raise or replace this later.
const SCENE_CAPACITY = 256

/**
 * App-level runtime hook for the vector editor web shell.
 *
 * Why:
 * - Keep `apps/vector-editor-web` responsible only for product assembly.
 * - Reuse the shared canvas lifecycle from `@venus/canvas-base`.
 *
 * Owns:
 * - creating the starter document for this app
 * - choosing the worker entry used by the web target
 * - configuring the initial scene capacity
 *
 * Not:
 * - shared-memory setup details
 * - worker protocol handling
 * - history/collaboration state management
 * - pointer/command dispatch implementation
 *
 * Example:
 * - `App.tsx` calls this hook, then forwards the returned runtime methods and
 *   snapshots into `EditorFrame`.
 */
export function useEditorRuntime() {
  // The document instance is created once so React rerenders do not accidentally
  // reset the editor scene or restart the runtime with a new document object.
  const document = useMemo(() => createStarterDocument(), [])

  // `useCanvasRuntime` memoizes by options identity, so this config must stay
  // stable unless the app intentionally wants to recreate the runtime.
  const runtimeOptions = useMemo(
    () => ({
      // Shared memory is preallocated with a fixed slot count for the current
      // scene snapshot representation.
      capacity: SCENE_CAPACITY,
      // The app chooses its own worker entrypoint while delegating the worker
      // lifecycle and message bridge to `canvas-base`.
      createWorker: () =>
        new Worker(new URL('../editor.worker.ts', import.meta.url), {
          type: 'module',
        }),
      // The starter document is the seed snapshot sent to the worker on init.
      document,
    }),
    [document],
  )

  // The shared runtime returns the current scene snapshot plus imperative
  // bridges like `postPointer`, `dispatchCommand`, and `clearHover`.
  return useCanvasRuntime(runtimeOptions)
}
