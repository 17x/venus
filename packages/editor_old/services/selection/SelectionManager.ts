 import Editor from '~/main/editor'
import {SelectionActionMode} from '~/services/selection/type'
import {ElementProps} from '~/elements/type'
 import {UID} from '~/type'
 import ElementBase from '~/elements/base/elementBase'

class SelectionManager {
  protected selected: Set<UID> = new Set()
  editor: Editor

  constructor(editor: Editor) {
    this.editor = editor
  }

  public has(id: UID): boolean {
    return this.selected.has(id)
  }

  public get size(): number {
    return this.selected.size
  }

  public get values(): Set<UID> {
    return new Set(this.selected)
  }

  public clear() {
    this.selected.clear()
  }

  public get pickIfUnique(): ElementProps | undefined {
    if (this.selected.size === 1) {
      const unique = [...this.selected.values()][0]
      const element = this.editor.mainHost.all.get(unique)

      if (element ) {
        return (element as ElementBase).toJSON()
      }
    }
  }

  public selectAll(): void {
    this.selected = this.editor.mainHost.allIds
  }

  public modify(idSet: Set<UID>, action: SelectionActionMode) {
    // selectionHelper.call(this, idSet, action)
    switch (action) {
      case 'add':
        this.add(idSet)
        break
      case 'delete':
        this.delete(idSet)
        break
      case 'toggle':
        this.toggle(idSet)
        break
      case 'replace':
        this.replace(idSet)
        break
    }
  }

  public add(idSet: Set<UID>) {
    idSet.forEach(id => {
      this.selected.add(id)
    })
  }

  public delete(idSet: Set<UID>) {
    idSet.forEach(id => {
      this.selected.delete(id)
    })
  }

  public toggle(idSet: Set<UID>) {
    idSet.forEach(id => {
      if (this.selected.has(id)) {
        this.selected.delete(id)
      } else {
        this.selected.add(id)
      }
    })
  }

  public replace(idSet: Set<UID>) {
    this.clear()

    this.selected = new Set(idSet)
  }

  destroy() {
    this.selected.clear()
  }
}

export default SelectionManager