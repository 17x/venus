import {RefObject, useContext, useEffect} from 'react'
import WorkspaceContext from '../contexts/workspaceContext/WorkspaceContext.tsx'

const useFocus = (ref: RefObject<HTMLElement | null>) => {
  const {state: {focused}, dispatch} = useContext(WorkspaceContext)

  useEffect(() => {
    if (!ref.current) return

    const element = ref.current

    const handleFocus = () => {
      if (!focused) {
        dispatch({type: 'SET_FOCUSED', payload: true})
      }
    }

    const handleMouseOut = () => {
      dispatch({type: 'SET_FOCUSED', payload: false})
    }

    element.addEventListener('mousemove', handleFocus)
    element.addEventListener('mouseenter', handleFocus)
    element.addEventListener('mouseleave', handleMouseOut)

    return () => {
      element.removeEventListener('mousemove', handleFocus)
      element.removeEventListener('mouseenter', handleFocus)
      element.removeEventListener('mouseleave', handleMouseOut)
    }
  }, [ref, focused])

}
export default useFocus