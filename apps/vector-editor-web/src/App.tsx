import './i18n/config.ts'
import EditorFrame from './components/editorFrame/EditorFrame.tsx'
import {ThemeProvider} from '@vector/ui'

function App() {
  return <ThemeProvider>
      <EditorFrame/>
  </ThemeProvider>
}

export default App
 
