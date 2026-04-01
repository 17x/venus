import {SubToolType} from '~/services/tool/toolManager'
import {generateBoundingRectFromTwoPoints} from '~/core/utils'
import {BoundingRect} from '~/type'
import {areSetsEqual, removeIntersectionAndMerge} from '~/lib/lib'

let _mouseMoved = false
let _selecting = new Set()
let _selectedCopy: Set<string> | null = null
const selecting: SubToolType = {
  cursor: 'default',
  mouseMove: function () {
    const {interaction, action, overlayHost, selection} = this.editor
    const {
      mouseStart,
      mouseCurrent,
      mouseWorldStart,
      mouseWorldCurrent,
      _modifier: {shiftKey, metaKey, ctrlKey},
    } = interaction
    const rect = generateBoundingRectFromTwoPoints(mouseStart, mouseCurrent)
    const _selected = selection.values

    if (!_selectedCopy) {
      _selectedCopy = new Set(selection.values)
    }
    interaction.updateSelectionBox(rect)

    const outer: BoundingRect = generateBoundingRectFromTwoPoints(mouseWorldStart, mouseWorldCurrent)
    const modifyKey = ctrlKey || metaKey || shiftKey

    _mouseMoved = true
    _selecting.clear()
    overlayHost.visibleElements.forEach((ele) => {
      const inner = ele.boundingRect

      if (
        inner.left >= outer.left &&
        inner.right <= outer.right &&
        inner.top >= outer.top &&
        inner.bottom <= outer.bottom
      ) {
        _selecting.add(ele.id)
      }
    })

    if (modifyKey) {
      // if (_selecting.size === 0) return
      // const SD = getSymmetricDifference(_selectedCopy, _selecting)
      const merged = removeIntersectionAndMerge(_selectedCopy, _selecting)

      if (areSetsEqual(_selectedCopy, merged)) return

      console.log(merged)

      action.dispatch('selection-modify', {
        mode: 'replace',
        idSet: merged,
      })
    } else {
      if (areSetsEqual(_selected, _selecting)) return

      if (_selecting.size === 0) {
        action.dispatch('selection-clear')
      } else {
        action.dispatch('selection-modify', {
          mode: 'replace',
          idSet: _selecting,
        })
      }
    }

    console.log([..._selecting])
  },
  mouseUp() {
    /*const {shiftKey, metaKey, ctrlKey} = this.interaction._modifier
    const {interaction, action, selection, cursor} = this
    interaction.hideSelectionBox()*/
    this.editor.interaction.hideSelectionBox()
    // this.tool = selector

    if (!_mouseMoved) {
      this.editor.action.dispatch('selection-clear')
    }

    _mouseMoved = false
    _selecting.clear()
    _selectedCopy?.clear()
    _selectedCopy = null
  },
}

export default selecting