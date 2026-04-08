import ZoomSelect from './ZoomSelect.tsx'
import {FC, Ref, useImperativeHandle, useState} from 'react'
import {Row} from '@venus/ui'
import {EditorExecutor} from '../../hooks/useEditorRuntime.ts'
import {EDITOR_TEXT_STATUS_CLASS} from '../editorChrome/editorTypography.ts'

export interface PointRef {
  set: (point: { x: number, y: number }) => void
}

type PointRefType = Ref<PointRef>

export const StatusBar: FC<{ ref: PointRefType | null, executeAction: EditorExecutor, worldScale: number }> = ({
                                                                                                     ref,
                                                                                                     executeAction,
                                                                                                     worldScale,
                                                                                                   }) => {
  const [worldPoint, setWorldPoint] = useState({x: 0, y: 0})

  useImperativeHandle(ref, () => {
    return {
      set(point: { x: number, y: number }) {
        setWorldPoint(point)
      },
    }
  }, [])

  return <Row between center fw h={30} style={{borderTop: '1px solid #dfdfdf'}}>
    <ZoomSelect scale={worldScale} onChange={(newScale) => {
      if (newScale === 'fit') {
        executeAction('world-zoom', 'fit')
      } else {
        executeAction('world-zoom', {
          zoomTo: true,
          zoomFactor: newScale,
        })
      }
    }}/>
    <div className={`line-clamp-1 ${EDITOR_TEXT_STATUS_CLASS}`}>{`dx:${worldPoint.x.toFixed(2)} dy:${worldPoint.y.toFixed(2)}`}</div>
  </Row>
}
