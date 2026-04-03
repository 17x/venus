import {SelectionActionMode} from './type'
import {UID} from '~/core/core'
import typeCheck from '~/core/typeCheck'
import SelectionManager from '~/services/selection/SelectionManager'

export function selectionHelper(
  this: SelectionManager,
  idSet: Set<UID>,
  action: SelectionActionMode,
) {
  if (typeCheck(idSet) !== 'set') return

  const temp = this.editor.selection.values

  this.clear()

  if (action === 'replace') {
    temp.clear()
  }

  idSet.forEach((id) => {
    switch (action) {
      case 'add':
        temp.add(id)
        break
      case 'delete':
        temp.delete(id)
        break
      case 'toggle':
        if (temp.has(id)) {
          temp.delete(id)
        } else {
          temp.add(id)
        }
        break
      case 'replace':
        temp.add(id)
        break
    }
  })

  temp.forEach((id) => this.selected.add(id))
}

/*
export function updateSelectionCanvasRenderData(this: Editor) {
  // const elementProps = this.selection.getSelectedPropsIfUnique

  return
  /!*
    if (elementProps) {
      const element = this.elementManager.all.get(elementProps.id)
      const {scale, dpr} = this.viewport
      const lineWidth = 1 / scale * dpr
      const resizeSize = 2 / scale * dpr
      const lineColor = '#5491f8'

      const o = element!.getOperators({
        size: resizeSize,
        lineColor,
        lineWidth,
      }, {
        size: 1,
        lineColor: '',
        lineWidth: 0,
      })

      o.forEach(
        (p) => {
          // @ts-ignore
          this.operationHandlers.add(p)
        },
      )
    }
  *!/
}
*/
