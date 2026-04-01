import React, {createContext} from 'react'
import {initialWorkspaceState, WorkspaceAction, WorkSpaceStateType} from './reducer/reducer.ts'

interface WorkspaceContextType {
  state: WorkSpaceStateType
  dispatch: React.Dispatch<WorkspaceAction>;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  state: initialWorkspaceState,
  dispatch: () => {},
})

export default WorkspaceContext