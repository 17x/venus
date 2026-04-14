import {type ReactNode, useEffect, useState} from 'react'
import {ProtectedInput} from './protectedInput.tsx'
import {Button, Con, Panel} from '@venus/ui'
import {EditorExecutor} from '../../hooks/useEditorRuntime.ts'
import type {SelectedElementProps} from '../../hooks/useEditorRuntime.types.ts'
import {LuMinus} from 'react-icons/lu'
import {
  EDITOR_PROPERTY_SECTION_CLASS,
  EDITOR_TEXT_CONTROL_CLASS,
  EDITOR_TEXT_PANEL_BODY_CLASS,
  EDITOR_TEXT_PANEL_HEADING_CLASS,
} from '../editorChrome/editorTypography.ts'

interface PropPanelProps {
  props?: SelectedElementProps
  executeAction: EditorExecutor
  onMinimize?: VoidFunction
}

const PropPanel = ({props, executeAction, onMinimize}: PropPanelProps) => {
  const [localProps, setLocalProps] = useState(props)

  useEffect(() => {
    setLocalProps(props)
  }, [props])

  return <Con flex={1} minH={0}>
    <Panel xs head={<PanelHead title="Properties" onMinimize={onMinimize}/>}>
      {localProps
        ? <ShapePropsPanel props={localProps} executeAction={executeAction}/>
        : <div className={`rounded border border-dashed border-gray-200 bg-gray-50 p-3 text-gray-500 ${EDITOR_TEXT_PANEL_BODY_CLASS}`}>
            Select an element to edit its properties.
          </div>}
    </Panel>
  </Con>
}

export default PropPanel

function PanelHead(props: {title: string, onMinimize?: VoidFunction}) {
  return (
    <div className={'flex w-full items-center justify-between gap-2'}>
      <span>{props.title}</span>
      {props.onMinimize &&
        <Button
          type="button"
          aria-label={`Minimize ${props.title}`}
          title={`Minimize ${props.title}`}
          className={'inline-flex size-5 items-center justify-center rounded text-gray-500 hover:bg-gray-200 hover:text-gray-900'}
          onClick={(event) => {
            event.stopPropagation()
            props.onMinimize?.()
          }}
        >
            <span>&minus;</span>
        </Button>}
    </div>
  )
}

function PropertySection(props: {title: string, children: ReactNode}) {
  return (
    <section
      className={[
        `rounded border border-gray-200 bg-gray-50/80 p-2 shadow-sm ${EDITOR_PROPERTY_SECTION_CLASS}`,
        '[&>div]:flex [&>div]:min-h-7 [&>div]:items-center [&>div]:justify-between [&>div]:gap-2',
        '[&_input:not([type=color]):not([type=checkbox])]:h-6 [&_input:not([type=color]):not([type=checkbox])]:rounded [&_input:not([type=color]):not([type=checkbox])]:border [&_input:not([type=color]):not([type=checkbox])]:border-gray-200 [&_input:not([type=color]):not([type=checkbox])]:bg-white [&_input:not([type=color]):not([type=checkbox])]:px-2 [&_input:not([type=color]):not([type=checkbox])]:text-gray-900',
        '[&_input[type=color]]:h-7 [&_input[type=color]]:w-9 [&_input[type=color]]:rounded [&_input[type=color]]:border [&_input[type=color]]:border-gray-200 [&_input[type=color]]:bg-white [&_input[type=color]]:p-1',
        '[&_input[type=checkbox]]:size-4 [&_input[type=checkbox]]:accent-gray-900',
      ].join(' ')}
    >
      <div className={`mb-1 border-b border-gray-200 pb-1 text-gray-500 ${EDITOR_TEXT_PANEL_HEADING_CLASS}`}>
        {props.title}
      </div>
      {props.children}
    </section>
  )
}

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

  return <div className={`z-30 flex flex-col gap-2 ${EDITOR_TEXT_PANEL_BODY_CLASS}`}>
    {/* Shape Properties Group */}
    <PropertySection title="Identity">
      <div className=" w-full h-full flex justify-between items-center">
        <span>Type:</span>
        <div className={`px-2 py-1 uppercase tracking-wide text-gray-700 bg-gray-100 rounded ${EDITOR_TEXT_CONTROL_CLASS}`}>
          {typeLabel}
        </div>
      </div>
      <div className="w-full h-full flex justify-between items-center gap-2">
        <span>ID:</span>
        <div className={`flex-1 min-w-0 text-right text-gray-600 truncate ${EDITOR_TEXT_CONTROL_CLASS}`} title={props.id}>
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
            <div className={`flex-1 min-w-0 text-right text-gray-600 truncate ${EDITOR_TEXT_CONTROL_CLASS}`}>
              {props.imageMeta?.assetName ?? props.asset ?? 'Linked image'}
            </div>
          </div>
          <div className="w-full h-full flex justify-between items-center gap-2">
            <span>Source:</span>
            <div className={`flex-1 min-w-0 text-right text-gray-600 truncate ${EDITOR_TEXT_CONTROL_CLASS}`}>
              {props.imageMeta?.mimeType ?? 'image/*'}
            </div>
          </div>
          <div className="w-full h-full flex justify-between items-center gap-2">
            <span>Natural:</span>
            <div className={`flex-1 min-w-0 text-right text-gray-600 truncate ${EDITOR_TEXT_CONTROL_CLASS}`}>
              {props.imageMeta?.naturalWidth && props.imageMeta?.naturalHeight
                ? `${props.imageMeta.naturalWidth} x ${props.imageMeta.naturalHeight}`
                : 'Unknown'}
            </div>
          </div>
          <div className="w-full h-full flex justify-between items-center gap-2">
            <span>Clip:</span>
            <div className={`flex-1 min-w-0 text-right text-gray-600 truncate ${EDITOR_TEXT_CONTROL_CLASS}`}>
              {typeof props.clipPathId === 'string' ? props.clipPathId : 'None'}
            </div>
          </div>
          <div className="w-full flex items-center gap-2 py-1">
            <Button
              type="button"
              onClick={() => executeAction('image-mask-with-shape')}
              className={`px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 ${EDITOR_TEXT_CONTROL_CLASS}`}
            >
              Mask with Shape
            </Button>
            <Button
              type="button"
              onClick={() => executeAction('image-clear-mask')}
              className={`px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 ${EDITOR_TEXT_CONTROL_CLASS}`}
            >
              Clear Mask
            </Button>
          </div>
        </>
      )}
      {props.schemaMeta && (
        <>
          <div className="w-full h-full flex justify-between items-center gap-2">
            <span>Schema Node:</span>
            <div className={`flex-1 min-w-0 text-right text-gray-600 truncate ${EDITOR_TEXT_CONTROL_CLASS}`}>
              {props.schemaMeta.sourceNodeType ?? 'Unknown'}
            </div>
          </div>
          <div className="w-full h-full flex justify-between items-center gap-2">
            <span>Node Kind:</span>
            <div className={`flex-1 min-w-0 text-right text-gray-600 truncate ${EDITOR_TEXT_CONTROL_CLASS}`}>
              {props.schemaMeta.sourceNodeKind ?? 'Unknown'}
            </div>
          </div>
          <div className="w-full h-full flex justify-between items-center gap-2">
            <span>Features:</span>
            <div className={`flex-1 min-w-0 text-right text-gray-600 truncate ${EDITOR_TEXT_CONTROL_CLASS}`}>
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
    </PropertySection>

    {/* Fill and Line Properties Group */}
    <PropertySection title="Fill and Stroke">
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
    </PropertySection>

    {(props.type === 'rectangle' || props.type === 'frame') && (
      <PropertySection title="Corners">
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
      </PropertySection>
    )}

    {props.type === 'ellipse' && (
      <PropertySection title="Ellipse">
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
      </PropertySection>
    )}

    {/* Appearance Group */}
    <PropertySection title="Appearance">
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
    </PropertySection>
  </div>
}
