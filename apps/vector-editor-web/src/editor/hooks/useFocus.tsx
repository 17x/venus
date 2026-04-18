import {RefObject, useEffect} from 'react'

const useFocus = (ref: RefObject<HTMLElement | null>, focused: boolean, onFocusedChange: (focused: boolean) => void) => {
  useEffect(() => {
    if (!ref.current) return

    const element = ref.current

    const handleFocus = () => {
      if (!focused) {
        onFocusedChange(true)
      }
    }

    const handleMouseOut = () => {
      onFocusedChange(false)
    }

    element.addEventListener('mousemove', handleFocus)
    element.addEventListener('mouseenter', handleFocus)
    element.addEventListener('mouseleave', handleMouseOut)

    return () => {
      element.removeEventListener('mousemove', handleFocus)
      element.removeEventListener('mouseenter', handleFocus)
      element.removeEventListener('mouseleave', handleMouseOut)
    }
  }, [ref, focused, onFocusedChange])

}
export default useFocus
