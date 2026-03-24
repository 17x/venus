import {FC, useEffect, useState} from 'react'
import {VisionFileType, VisionWorkspace} from '../../contexts/appContext/AppContext.tsx'

const File: FC<{ file: VisionFileType }> = ({file}) => {
  const [currentWS, setCurrentWS] = useState<string>(file.workspace[0].id)
  const [workspace, setWorkspace] = useState<VisionWorkspace[]>([])


  useEffect(() => {
    setWorkspace(file.workspace)
  }, [])


}

export default File