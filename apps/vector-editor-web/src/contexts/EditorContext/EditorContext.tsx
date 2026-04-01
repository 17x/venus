import {createContext} from 'react'
import {EditorExecutor} from '../../components/workspace/Workspace.tsx'

interface EditorContextType {
  executeAction: EditorExecutor
}

const EditorContext = createContext<EditorContextType>({
  executeAction: () => {},
})

export default EditorContext