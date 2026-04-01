import {createContext, useContext} from 'react'

const UIContext = createContext<{ dpr: number }>({
  dpr: 2,
})

export const useUI = () => useContext(UIContext)

export default UIContext