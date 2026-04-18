import './components/comp.css'
import './i18n/config.ts'
import EditorFrame from './components/editorFrame/EditorFrame.tsx'
import {LiteUIProvider, ThemeProvider} from '@vector/ui'

function App() {
  return <ThemeProvider>
    <LiteUIProvider>
      <EditorFrame/>
    </LiteUIProvider>
  </ThemeProvider>
}

export default App
 
