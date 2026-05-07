import '../i18n/config.ts'
import EditorFrame from '../views/editorFrame/EditorFrame.tsx'
import {ThemeProvider} from '../ui/index.ts'

function App() {
  return <ThemeProvider>
      <EditorFrame/>
  </ThemeProvider>
}

export default App
 
