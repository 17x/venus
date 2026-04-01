import {useContext, useEffect, useState} from 'react'
import {ProtectedInput} from './protectedInput.tsx'
import {Con, Panel} from '@lite-u/ui'
import EditorContext from '../../contexts/EditorContext/EditorContext.tsx'
import {ElementProps} from '@lite-u/editor/types'

interface PropPanelProps {props?: ElementProps}

const PropPanel = ({props}: PropPanelProps) => {
  const [localProps, setLocalProps] = useState(props)

  useEffect(() => {
    setLocalProps(props)
  }, [props])

  return <Con p={10} h={'33.33%'}>
    <Panel xs head={'Properties'}
           contentStyle={{
             overflow: 'hidden',
           }}>
      <Con p={10} fh
           className={'scrollbar-custom overflow-x-hidden overflow-y-auto  border  border-gray-200 select-none'}>
        {localProps && <ShapePropsPanel props={localProps}/>}
      </Con>
    </Panel>
  </Con>
}

export default PropPanel

const ShapePropsPanel = ({props}: { props: ElementProps }) => {
  const {executeAction} = useContext(EditorContext)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const keyName = e.target.name as keyof ElementProps
    let newValue: string | number = e.target.value

    // @ts-ignore
    if (['x', 'y', 'width', 'height', 'rotation'].includes(keyName)) {
      newValue = Number(newValue)
    } else if (['x', 'y', 'width', 'height', 'rotation'].includes(keyName)) {
      newValue = Number(newValue)
    }

    // console.log(keyName,newValue)
    executeAction('element-modify', [{
      id: props.id,
      props: {
        [keyName]: newValue,
      },
    }])

    e.preventDefault()
    e.stopPropagation()
  }

  return <div className="z-30 text-sm">
    {/* Shape Properties Group */}
    <div className="mb-1 ">
      <div className=" w-full h-full flex justify-between items-center">
        <span className={''}>X:</span>
        <ProtectedInput
          type="number"
          name="x"
          value={props.x}
          onChange={handleChange}
          className="w-16  py-1 text-black rounded"
        />
      </div>
      <div className=" w-full h-full flex justify-between items-center">
        <span className={''}>Y:</span>
        <ProtectedInput
          type="number"
          name="y"
          value={props.y}
          onChange={handleChange}
          className="w-16  py-1 text-black rounded"
        />
      </div>
      {
        props.type === 'ellipse' && <>
              <div className=" w-full h-full flex justify-between items-center">
                  <span className={''}>r1:</span>
                  <ProtectedInput
                      type="number"
                      name="r1"
                      value={props.r1}
                      onChange={handleChange}
                      className="w-16  py-1 text-black rounded"
                  />
              </div>
              <div className=" w-full h-full flex justify-between items-center">
                  <span>r2:</span>
                  <ProtectedInput
                      type="number"
                      name="r2"
                      value={props.r2}
                      onChange={handleChange}
                      className="w-16  py-1 text-black rounded"
                  />
              </div>
          </>
      }
      <div className=" w-full h-full flex justify-between items-center">
        <span className={''}>Width:</span>
        <ProtectedInput
          type="number"
          name="width"
          value={props.width}
          onChange={handleChange}
          className="w-16  py-1 text-black rounded"
        />
      </div>
      <div className=" w-full h-full flex justify-between items-center">
        <span>Height:</span>
        <ProtectedInput
          type="number"
          name="height"
          value={props.height}
          onChange={handleChange}
          className="w-16  py-1 text-black rounded"
        />
      </div>
      <div className=" w-full h-full flex justify-between items-center">
        <span>Rotation:</span>
        <ProtectedInput
          type="number"
          name="rotation"
          value={props.rotation}
          onChange={handleChange}
          className="w-16  py-1 text-black rounded"
        />
      </div>
    </div>

    {/* Fill and Line Properties Group */}
    <div className="mb-1">
      <div className=" w-full h-full flex justify-between items-center">
        <span>Enable Fill</span>
        <ProtectedInput
          type="checkbox"
          name="enableFill"
          checked={props.fill.enabled}
          onChange={(e) => {
            // console.log(e.target.checked)
            executeAction('element-modify', [{
              id: props.id,
              props: {
                fill: {enabled: e.target.checked},
              },
            }])
          }}
          className="ml-2"
        />
      </div>
      <div className=" w-full h-full flex justify-between items-center">
        <span>Fill Color:</span>
        <ProtectedInput
          type="color"
          name="fillColor"
          value={props.fill.color}
          // onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            // console.log(e)
            executeAction('element-modify', [{
              id: props.id,
              props: {
                fill: {color: e.target.value},
              },
            }])
          }}
          // onChange={handleChange}
          className="w-10 h-10 p-1 rounded"
        />
      </div>
      <div className=" w-full h-full flex justify-between items-center">
        <span>Enable Line</span>
        <ProtectedInput
          type="checkbox"
          name="enableLine"
          defaultChecked={props.stroke.enabled}
          onChange={(e) => {
            executeAction('element-modify', [{
              id: props.id,
              props: {
                stroke: {enabled: e.target.checked},
              },
            }])
          }}
          className="ml-2"
        />
      </div>
      <div className=" w-full h-full flex justify-between items-center">
        <span>Line Color:</span>
        <ProtectedInput
          type="color"
          name="lineColor"
          value={props.stroke.color}
          onChange={(e) => {
            executeAction('element-modify', [{
              id: props.id,
              props: {
                stroke: {color: e.target.value},
              },
            }])
          }}
          className="w-10 h-10 p-1 rounded"
        />
      </div>
      <div className=" w-full h-full flex justify-between items-center">
        <span className={''}>Line Width:</span>
        <ProtectedInput
          type="number"
          name="lineWidth"
          step={0.25}
          value={props.stroke.weight}
          onChange={(e)=>{
            executeAction('element-modify', [{
              id: props.id,
              props: {
                stroke: {weight: e.target.value},
              },
            }])
          }}
          className="w-16  py-1 text-black rounded"
        />
      </div>
    </div>

    {/* Appearance Group */}
    <div className="mb-1">
      {/*<div className=" w-full h-full flex justify-between items-center">
        <span>Shadow</span>
        <ProtectedInput
          type="checkbox"
          name="shadow"
          defaultChecked={props.shadow}
          onChange={handleChange}
          className="ml-2"
        />
      </div>*/}
      <div className=" w-full h-full flex justify-between items-center">
        <span>Opacity:</span>
        <ProtectedInput
          type="number"
          name="opacity"
          value={props.opacity}
          onChange={handleChange}
          className="w-16  py-1 text-black rounded"
        />
      </div>
    </div>
  </div>
}