import {useEffect, useState} from 'react'
import {ProtectedInput} from './protectedInput.tsx'
import {Con, Panel} from '@lite-u/ui'
import {EditorExecutor} from '../../hooks/useEditorRuntime.ts'
import type {SelectedElementProps} from '../../hooks/useEditorRuntime.types.ts'

interface PropPanelProps {
  props?: SelectedElementProps
  executeAction: EditorExecutor
}

const PropPanel = ({props, executeAction}: PropPanelProps) => {
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
        {localProps && <ShapePropsPanel props={localProps} executeAction={executeAction}/>}
      </Con>
    </Panel>
  </Con>
}

export default PropPanel

const ShapePropsPanel = ({props, executeAction}: { props: SelectedElementProps, executeAction: EditorExecutor }) => {
  const fill = {
    enabled: props.fill?.enabled ?? true,
    color: props.fill?.color ?? '#000000',
  }
  const stroke = {
    enabled: props.stroke?.enabled ?? true,
    color: props.stroke?.color ?? '#000000',
    weight: props.stroke?.weight ?? 1,
  }
  const shadow = {
    enabled: props.shadow?.enabled ?? false,
    color: props.shadow?.color ?? '#000000',
    offsetX: props.shadow?.offsetX ?? 0,
    offsetY: props.shadow?.offsetY ?? 0,
    blur: props.shadow?.blur ?? 8,
  }
  const cornerRadii = {
    topLeft: props.cornerRadii?.topLeft ?? props.cornerRadius ?? 0,
    topRight: props.cornerRadii?.topRight ?? props.cornerRadius ?? 0,
    bottomRight: props.cornerRadii?.bottomRight ?? props.cornerRadius ?? 0,
    bottomLeft: props.cornerRadii?.bottomLeft ?? props.cornerRadius ?? 0,
  }
  const typeLabel = String(props.type ?? 'unknown')

  const patchElementProps = (nextProps: Partial<SelectedElementProps>) => {
    executeAction('element-modify', [{
      id: props.id,
      props: nextProps,
    }])
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const keyName = e.target.name as Extract<keyof SelectedElementProps, string>
    let newValue: string | number = e.target.value

    // @ts-ignore
    if (['x', 'y', 'width', 'height', 'rotation', 'cornerRadius', 'ellipseStartAngle', 'ellipseEndAngle'].includes(keyName)) {
      newValue = Number(newValue)
    }

    patchElementProps({[keyName]: newValue} as Partial<SelectedElementProps>)

    e.preventDefault()
    e.stopPropagation()
  }

  return <div className="z-30 text-sm">
    {/* Shape Properties Group */}
    <div className="mb-1 ">
      <div className=" w-full h-full flex justify-between items-center">
        <span>Type:</span>
        <div className="px-2 py-1 text-xs uppercase tracking-wide text-gray-700 bg-gray-100 rounded">
          {typeLabel}
        </div>
      </div>
      <div className="w-full h-full flex justify-between items-center gap-2">
        <span>ID:</span>
        <div className="flex-1 min-w-0 text-right text-xs text-gray-600 truncate" title={props.id}>
          {props.id}
        </div>
      </div>
      {props.type === 'text' && (
        <div className=" w-full h-full flex justify-between items-center gap-2">
          <span>Text:</span>
          <ProtectedInput
            type="text"
            name="name"
            value={props.name ?? ''}
            onChange={handleChange}
            className="flex-1 min-w-0 py-1 text-black rounded"
          />
        </div>
      )}
      {props.type === 'image' && (
        <>
          <div className="w-full h-full flex justify-between items-center gap-2">
            <span>Asset:</span>
            <div className="flex-1 min-w-0 text-right text-xs text-gray-600 truncate">
              {props.imageMeta?.assetName ?? props.asset ?? 'Linked image'}
            </div>
          </div>
          <div className="w-full h-full flex justify-between items-center gap-2">
            <span>Source:</span>
            <div className="flex-1 min-w-0 text-right text-xs text-gray-600 truncate">
              {props.imageMeta?.mimeType ?? 'image/*'}
            </div>
          </div>
          <div className="w-full h-full flex justify-between items-center gap-2">
            <span>Natural:</span>
            <div className="flex-1 min-w-0 text-right text-xs text-gray-600 truncate">
              {props.imageMeta?.naturalWidth && props.imageMeta?.naturalHeight
                ? `${props.imageMeta.naturalWidth} x ${props.imageMeta.naturalHeight}`
                : 'Unknown'}
            </div>
          </div>
          <div className="w-full h-full flex justify-between items-center gap-2">
            <span>Clip:</span>
            <div className="flex-1 min-w-0 text-right text-xs text-gray-600 truncate">
              {typeof props.clipPathId === 'string' ? props.clipPathId : 'None'}
            </div>
          </div>
          <div className="w-full flex items-center gap-2 py-1">
            <button
              type="button"
              onClick={() => executeAction('image-mask-with-shape')}
              className="px-2 py-1 text-xs rounded border border-gray-300 hover:bg-gray-50"
            >
              Mask with Shape
            </button>
            <button
              type="button"
              onClick={() => executeAction('image-clear-mask')}
              className="px-2 py-1 text-xs rounded border border-gray-300 hover:bg-gray-50"
            >
              Clear Mask
            </button>
          </div>
        </>
      )}
      {props.schemaMeta && (
        <>
          <div className="w-full h-full flex justify-between items-center gap-2">
            <span>Schema Node:</span>
            <div className="flex-1 min-w-0 text-right text-xs text-gray-600 truncate">
              {props.schemaMeta.sourceNodeType ?? 'Unknown'}
            </div>
          </div>
          <div className="w-full h-full flex justify-between items-center gap-2">
            <span>Node Kind:</span>
            <div className="flex-1 min-w-0 text-right text-xs text-gray-600 truncate">
              {props.schemaMeta.sourceNodeKind ?? 'Unknown'}
            </div>
          </div>
          <div className="w-full h-full flex justify-between items-center gap-2">
            <span>Features:</span>
            <div className="flex-1 min-w-0 text-right text-xs text-gray-600 truncate">
              {props.schemaMeta.sourceFeatureKinds?.join(', ') ?? 'Unknown'}
            </div>
          </div>
        </>
      )}
      <div className=" w-full h-full flex justify-between items-center">
        <span className={''}>X:</span>
        <ProtectedInput
          type="number"
          name="x"
          value={props.x ?? props.cx ?? 0}
          onChange={handleChange}
          className="w-16  py-1 text-black rounded"
        />
      </div>
      <div className=" w-full h-full flex justify-between items-center">
        <span className={''}>Y:</span>
        <ProtectedInput
          type="number"
          name="y"
          value={props.y ?? props.cy ?? 0}
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
                      value={props.r1 ?? 0}
                      onChange={handleChange}
                      className="w-16  py-1 text-black rounded"
                  />
              </div>
              <div className=" w-full h-full flex justify-between items-center">
                  <span>r2:</span>
                  <ProtectedInput
                      type="number"
                      name="r2"
                      value={props.r2 ?? 0}
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
          value={props.width ?? 0}
          onChange={handleChange}
          className="w-16  py-1 text-black rounded"
        />
      </div>
      <div className=" w-full h-full flex justify-between items-center">
        <span>Height:</span>
        <ProtectedInput
          type="number"
          name="height"
          value={props.height ?? 0}
          onChange={handleChange}
          className="w-16  py-1 text-black rounded"
        />
      </div>
      <div className=" w-full h-full flex justify-between items-center">
        <span>Rotation:</span>
        <ProtectedInput
          type="number"
          name="rotation"
          value={props.rotation ?? 0}
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
          checked={fill.enabled}
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
          value={fill.color}
          // onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            // console.log(e)
            patchElementProps({
              fill: {color: e.target.value},
            })
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
          checked={stroke.enabled}
          onChange={(e) => {
            patchElementProps({
              stroke: {enabled: e.target.checked},
            })
          }}
          className="ml-2"
        />
      </div>
      <div className=" w-full h-full flex justify-between items-center">
        <span>Line Color:</span>
        <ProtectedInput
          type="color"
          name="lineColor"
          value={stroke.color}
          onChange={(e) => {
            patchElementProps({
              stroke: {color: e.target.value},
            })
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
          value={stroke.weight}
          onChange={(e)=>{
            patchElementProps({
              stroke: {weight: Number(e.target.value)},
            })
          }}
          className="w-16  py-1 text-black rounded"
        />
      </div>
    </div>

    {(props.type === 'rectangle' || props.type === 'frame') && (
      <div className="mb-1">
        <div className=" w-full h-full flex justify-between items-center">
          <span>Corner Radius:</span>
          <ProtectedInput
            type="number"
            name="cornerRadius"
            value={props.cornerRadius ?? 0}
            onChange={handleChange}
            className="w-16  py-1 text-black rounded"
          />
        </div>
        <div className=" w-full h-full flex justify-between items-center">
          <span>Corner TL:</span>
          <ProtectedInput
            type="number"
            name="cornerTopLeft"
            value={cornerRadii.topLeft}
            onChange={(e) => patchElementProps({
              cornerRadii: {topLeft: Number(e.target.value)},
            })}
            className="w-16 py-1 text-black rounded"
          />
        </div>
        <div className=" w-full h-full flex justify-between items-center">
          <span>Corner TR:</span>
          <ProtectedInput
            type="number"
            name="cornerTopRight"
            value={cornerRadii.topRight}
            onChange={(e) => patchElementProps({
              cornerRadii: {topRight: Number(e.target.value)},
            })}
            className="w-16 py-1 text-black rounded"
          />
        </div>
        <div className=" w-full h-full flex justify-between items-center">
          <span>Corner BR:</span>
          <ProtectedInput
            type="number"
            name="cornerBottomRight"
            value={cornerRadii.bottomRight}
            onChange={(e) => patchElementProps({
              cornerRadii: {bottomRight: Number(e.target.value)},
            })}
            className="w-16 py-1 text-black rounded"
          />
        </div>
        <div className=" w-full h-full flex justify-between items-center">
          <span>Corner BL:</span>
          <ProtectedInput
            type="number"
            name="cornerBottomLeft"
            value={cornerRadii.bottomLeft}
            onChange={(e) => patchElementProps({
              cornerRadii: {bottomLeft: Number(e.target.value)},
            })}
            className="w-16 py-1 text-black rounded"
          />
        </div>
      </div>
    )}

    {props.type === 'ellipse' && (
      <div className="mb-1">
        <div className=" w-full h-full flex justify-between items-center">
          <span>Start Angle:</span>
          <ProtectedInput
            type="number"
            name="ellipseStartAngle"
            value={props.ellipseStartAngle ?? 0}
            onChange={handleChange}
            className="w-16 py-1 text-black rounded"
          />
        </div>
        <div className=" w-full h-full flex justify-between items-center">
          <span>End Angle:</span>
          <ProtectedInput
            type="number"
            name="ellipseEndAngle"
            value={props.ellipseEndAngle ?? 360}
            onChange={handleChange}
            className="w-16 py-1 text-black rounded"
          />
        </div>
      </div>
    )}

    {/* Appearance Group */}
    <div className="mb-1">
      <div className=" w-full h-full flex justify-between items-center">
        <span>Shadow</span>
        <ProtectedInput
          type="checkbox"
          name="shadowEnabled"
          checked={shadow.enabled}
          onChange={(e) => patchElementProps({
            shadow: {enabled: e.target.checked},
          })}
          className="ml-2"
        />
      </div>
      <div className=" w-full h-full flex justify-between items-center">
        <span>Shadow Color:</span>
        <ProtectedInput
          type="color"
          name="shadowColor"
          value={shadow.color}
          onChange={(e) => patchElementProps({
            shadow: {color: e.target.value},
          })}
          className="w-10 h-10 p-1 rounded"
        />
      </div>
      <div className=" w-full h-full flex justify-between items-center">
        <span>Shadow X:</span>
        <ProtectedInput
          type="number"
          name="shadowOffsetX"
          value={shadow.offsetX}
          onChange={(e) => patchElementProps({
            shadow: {offsetX: Number(e.target.value)},
          })}
          className="w-16 py-1 text-black rounded"
        />
      </div>
      <div className=" w-full h-full flex justify-between items-center">
        <span>Shadow Y:</span>
        <ProtectedInput
          type="number"
          name="shadowOffsetY"
          value={shadow.offsetY}
          onChange={(e) => patchElementProps({
            shadow: {offsetY: Number(e.target.value)},
          })}
          className="w-16 py-1 text-black rounded"
        />
      </div>
      <div className=" w-full h-full flex justify-between items-center">
        <span>Shadow Blur:</span>
        <ProtectedInput
          type="number"
          name="shadowBlur"
          value={shadow.blur}
          onChange={(e) => patchElementProps({
            shadow: {blur: Number(e.target.value)},
          })}
          className="w-16 py-1 text-black rounded"
        />
      </div>
      <div className=" w-full h-full flex justify-between items-center">
        <span>Opacity:</span>
        <ProtectedInput
          type="number"
          name="opacity"
          value={props.opacity ?? 1}
          onChange={handleChange}
          className="w-16  py-1 text-black rounded"
        />
      </div>
    </div>
  </div>
}
