import { EditorFrame } from '@venus/editor-ui'
import { useEditorRuntime } from './hooks/useEditorRuntime.ts'

function App() {
  const runtime = useEditorRuntime()

  return (
    <EditorFrame
      document={runtime.document}
      shapes={runtime.shapes}
      stats={runtime.stats}
      runtimeReady={runtime.ready}
      sabSupported={runtime.sabSupported}
      onPointerMove={(pointer) => runtime.postPointer('pointermove', pointer)}
      onPointerDown={(pointer) => runtime.postPointer('pointerdown', pointer)}
      onPointerLeave={runtime.clearHover}
    />
  )
}

export default App
