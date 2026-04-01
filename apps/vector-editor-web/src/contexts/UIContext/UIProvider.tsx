import {FC, ReactNode} from 'react'
import UIContext, {useUI} from './UIContext.tsx'

const UIProvider: FC<{ children: ReactNode }> = ({children}) => {
  const {dpr} = useUI()

  return <UIContext.Provider value={{
    dpr,
  }}>
    {children}
  </UIContext.Provider>
}

export default UIProvider