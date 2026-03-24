import {useContext} from "react"
import AppContext from "../../contexts/appContext/AppContext.tsx"
import {LuPlus} from "react-icons/lu"

const FilesTab: React.FC = () => {
  const basicTabClasses = ' group py-2 px-6 relative transition flex items-center">'
  const activeTabClasses = ' bg-gray-200'
  const unActiveTabClasses = ' hover:bg-gray-200'
  const {fileList, focusedFileId, closeFile, focusOnFile, handleCreating} = useContext(AppContext)

  return <div className="flex flex-row items-center text-sm select-none">
    {
      fileList.map(file => {
        const isActive = file.id === focusedFileId
        const currentTabClasses = basicTabClasses + (isActive ? activeTabClasses : unActiveTabClasses)
        const currCloseIconClasses: string = (isActive ? 'visible' : 'invisible') + ' w-2 h-2 ml-4 opacity-50 hover:opacity-100 group-hover:visible w-2 h-2 cursor-pointer'

        return <div key={file.id}
                    className={currentTabClasses}
                    onClick={() => {
                      focusOnFile(file.id)
                    }}>
          <span>{file.name}</span>
          <span
            onClick={(e) => {
              closeFile(file.id)
              e.preventDefault()
              e.stopPropagation()
            }}
            className={currCloseIconClasses}>&times;</span>
        </div>
      })
    }

    <button className={'hover:cursor-pointer hover:opacity-100 cursor-pointer opacity-50'}>
      <LuPlus size={18} onClick={() => {
        handleCreating(true)
      }}/>
    </button>
  </div>
}

export default FilesTab