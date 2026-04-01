import {FC, ReactNode, useEffect, useMemo, useReducer} from 'react'
import WorkspaceContext from './WorkspaceContext.tsx'
import {WorkspaceReducer, initialWorkspaceState} from './reducer/reducer.ts'

const WorkspaceProvider: FC<{ children: ReactNode }> = ({children}) => {
  const [state, dispatch] = useReducer(WorkspaceReducer, initialWorkspaceState)

  const contextValue = useMemo(() => ({
    state,
    dispatch,
  }), [state])

  useEffect(() => { }, [])

  return <WorkspaceContext.Provider value={contextValue}>
    {children}
  </WorkspaceContext.Provider>
}

export default WorkspaceProvider