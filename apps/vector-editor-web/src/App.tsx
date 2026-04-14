import './components/comp.css'
import './i18n/config.ts'
import EditorFrame from './components/editorFrame/EditorFrame.tsx'
import {LiteUIProvider} from '@venus/ui'

function App() {
  return <LiteUIProvider>
    <EditorFrame/>
  </LiteUIProvider>
}

export default App
 
