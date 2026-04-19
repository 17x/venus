import {FC, RefObject, useEffect, useRef, useState} from 'react'
import {Button} from '@vector/ui'

export const Print: FC<{
  onClose: VoidFunction,
  editorRef: RefObject<{ printOut?: (ctx: CanvasRenderingContext2D) => void } | null>
}> = ({
        onClose,
        editorRef,
      }) => {
  const printPreviewCanvas = useRef<HTMLCanvasElement>(null)
  const [dpr] = useState(2)

  useEffect(() => {
    createPreview()
  }, [editorRef])

  const createPreview = () => {
    if (!editorRef || !editorRef.current || !printPreviewCanvas) {
      // console.log(editorRef.current)
      return
    }
    // const {frame} = editorRef.current!.viewport
    // const rect = frame.getBoundingRect()
    const destCanvas = printPreviewCanvas.current
    const destCtx = destCanvas!.getContext('2d')
    if (!destCtx) return

    // destCanvas!.width = rect.width * dpr
    // destCanvas!.height = rect.height * dpr

    destCtx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    editorRef.current.printOut?.(destCtx)

    const close: EventListenerOrEventListenerObject = (e) => {
      onClose()
      e.preventDefault()
      e.stopPropagation()
      window.removeEventListener('keydown', close, {capture: true})
    }

    window.addEventListener('keydown', close, {capture: true})

    return () => {
      window.removeEventListener('keydown', close, {capture: true})
    }
  }

  return <div className={'fixed top-0 left-0 w-full h-full z-100 flex items-center justify-center'}>
    <div className={'absolute top-0 left-0 w-full h-full bg-black/50'} onClick={onClose}></div>
    <div className={'flex w-[90%] h-[90%] rounded border border-[var(--venus-shell-border)] bg-[var(--venus-shell-surface)] z-10 px-2 py-4'}>
      <div className={'w-[50%] flex items-center justify-center overflow-hidden'}>
        <canvas ref={printPreviewCanvas} className={'max-w-full max-h-full border border-[var(--venus-shell-border)]'}></canvas>
      </div>
      <div className={'w-[50%] flex flex-col justify-between'}>
        <div></div>
        <div className={'w-full flex items-end'}>
          <Button type={'button'} title={'Print document'} className={'cursor-pointer border border-[var(--venus-shell-border)]'}
                  onClick={() => {
                    const printWindow = window.open('', '', 'width=600,height=600')
                    if (!printWindow) return
                    const canvas = document.createElement('canvas')
                    const ctx = canvas.getContext('2d')

                    canvas.width = printPreviewCanvas.current!.width
                    canvas.height = printPreviewCanvas.current!.height
                    ctx!.drawImage(printPreviewCanvas.current!, 0, 0)

                    printWindow.document.body.append(canvas)
                    printWindow.document.close()
                    printWindow.focus()
                    printWindow.print()
                    printWindow.close()
                  }}
          >
            Print
          </Button>
        </div>
      </div>
    </div>
  </div>
}
