import { useEffect, useMemo, useRef, useState } from 'react'
import { createStarterDocument } from '@venus/editor-core'
import type { SceneUpdateMessage } from '@venus/editor-worker'
import {
  attachSceneMemory,
  createSceneMemory,
  readSceneSnapshot,
  readSceneStats,
  type PointerState,
  type SceneMemory,
  type SceneShapeSnapshot,
  type SceneStats,
} from '@venus/shared-memory'

const SCENE_CAPACITY = 256

export function useEditorRuntime() {
  const document = useMemo(() => createStarterDocument(), [])
  const sabSupported =
    typeof SharedArrayBuffer !== 'undefined' &&
    typeof crossOriginIsolated !== 'undefined' &&
    crossOriginIsolated

  const [ready, setReady] = useState(false)
  const [stats, setStats] = useState<SceneStats>({
    version: 0,
    shapeCount: document.shapes.length,
    hoveredIndex: -1,
    selectedIndex: -1,
  })
  const [shapes, setShapes] = useState<SceneShapeSnapshot[]>(
    document.shapes.map((shape) => ({
      ...shape,
      isHovered: false,
      isSelected: false,
    })),
  )
  const sceneRef = useRef<SceneMemory | null>(null)
  const workerRef = useRef<Worker | null>(null)

  useEffect(() => {
    if (!sabSupported) {
      return
    }

    const buffer = createSceneMemory(SCENE_CAPACITY)
    const scene = attachSceneMemory(buffer, SCENE_CAPACITY)
    const worker = new Worker(new URL('../editor.worker.ts', import.meta.url), {
      type: 'module',
    })

    sceneRef.current = scene
    workerRef.current = worker

    worker.addEventListener('message', (event: MessageEvent<SceneUpdateMessage>) => {
      if (event.data.type === 'scene-ready') {
        setReady(true)
      }

      if (!sceneRef.current) {
        return
      }

      setStats(readSceneStats(sceneRef.current))
      setShapes(readSceneSnapshot(sceneRef.current, document))
    })

    worker.postMessage({
      type: 'init',
      buffer,
      capacity: SCENE_CAPACITY,
      document,
    })

    return () => {
      worker.terminate()
      workerRef.current = null
      sceneRef.current = null
    }
  }, [document, sabSupported])

  const postPointer = (type: 'pointermove' | 'pointerdown', pointer: PointerState) => {
    workerRef.current?.postMessage({ type, pointer })
  }

  return {
    document,
    shapes,
    stats,
    ready,
    sabSupported,
    postPointer,
    clearHover: () => workerRef.current?.postMessage({ type: 'pointerleave' }),
  }
}
