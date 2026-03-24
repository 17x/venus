import {
  LuCross,
  LuGroup,
  LuRedo,
  LuSave,
  LuTrash,
  LuUndo,
  LuUngroup,
  LuLock,
  LuLockOpen
} from "react-icons/lu"

export const NamedIcon: React.FC<{ size: number, iconName: string }> = ({iconName, size}) => {
  switch (iconName) {
    case "save":
      return <LuSave size={size}/>
    case "undo":
      return <LuUndo size={size}/>
    case "redo":
      return <LuRedo size={size}/>
    case "trash":
      return <LuTrash size={size}/>
    case "cross":
      return <LuCross size={size}/>
    case "group":
      return <LuGroup size={size}/>
    case "ungroup":
      return <LuUngroup size={size}/>
    case "lock":
      return <LuLock size={size}/>
    case "unlock":
      return <LuLockOpen size={size}/>
    default:
      return null
  }
}