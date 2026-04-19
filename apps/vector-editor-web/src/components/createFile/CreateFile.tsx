import {FC, FormEvent, useRef, useState} from 'react'
import {convertUnit, UnitType} from '@venus/document-core'
import uid from '../../shared/utilities/Uid.ts'
import {VisionFileType} from '../../editor/hooks/useEditorRuntime.ts'
import {Button, Con, Flex, Input, Modal, P, Select, SelectItem, Title} from '@vector/ui'
import {PAGE_PRESETS} from './pagePresets.ts'
import {useTranslation} from 'react-i18next'
import {VISION_VERSION} from '../../shared/constants/version.ts'
import {
  EDITOR_HEADING_STYLE,
  EDITOR_TEXT_BODY_CLASS,
  EDITOR_TEXT_CONTROL_CLASS,
  EDITOR_TEXT_HEADING_CLASS,
  EDITOR_TEXT_MENU_CLASS,
} from '../editorChrome/editorTypography.ts'
import {TEST_IDS} from '../../testing/testIds.ts'

const CreateFile: FC<{ bg: string, createFile: (file: VisionFileType) => void, onBgClick?: VoidFunction }> = ({bg = '#00000066', createFile, onBgClick}) => {
  const formRef = useRef<HTMLFormElement>(null)
  const {t} = useTranslation()
  const [currentPageSet, setCurrentPageSet] = useState({...PAGE_PRESETS[0]})
  const [dpi, setDpi] = useState(72)
  const [error, setError] = useState('')
  const validateFileName = (str: string) => {
    return /^[a-zA-Z0-9-_ ]+$/.test(str)
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (!validateFileName(currentPageSet.name)) {
      setError('File names may only contain alphabetic characters, numbers, and spaces.')
      return
    }

    setError('')
    const fileId = uid()

    const newFile: VisionFileType = {
      id: fileId,
      name: currentPageSet.name,
      version: VISION_VERSION,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      config: {
        page: {
          dpi,
          ...currentPageSet,
        },
      },
      elements: [],
      assets: [],
    }

    createFile(newFile)
  }

  const handleChange = (key: string, value: number | string) => {
    setCurrentPageSet(prevState => {
      return {
        ...prevState,
        [key]: value,
      }
    })
  }

  const handleNewUnit = (newUnit: UnitType) => {
    const {name, unit, width, height} = currentPageSet
    const newWidth = Number((convertUnit(width, unit, newUnit)).toFixed(2))
    const newHeight = Number((convertUnit(height, unit, newUnit)).toFixed(2))

    setCurrentPageSet({
      name,
      width: newWidth,
      height: newHeight,
      unit: newUnit,
    })
  }

  return <Modal backdropBg={bg} style={{
    zIndex: 1000,
  }} onBackdropClick={() => onBgClick && onBgClick()}>
    <Flex col w={'90%'} h={'90%'} ovh className={`shadow-md rounded-sm shadow-gray-600 ${EDITOR_TEXT_BODY_CLASS}`}>
      <section className={'flex h-full w-full min-h-0 flex-col overflow-hidden p-2 text-[12px] leading-[18px] text-slate-950 dark:text-slate-100'} role={'region'}>
        <div className={'mb-2 flex items-center justify-between gap-2 text-slate-900'}>
          <h2 data-testid={TEST_IDS.createFile.heading} className={'font-semibold'}>{t('createTitle')}</h2>
        </div>
        <Flex alignItems={'stretch'} justifyContent={'center'} fh className={'min-h-0 overflow-y-auto p-2'}>

          <Con p={4} bg={'white'}>
            <Title h2 className={EDITOR_TEXT_HEADING_CLASS} style={EDITOR_HEADING_STYLE}>Templates</Title>
            <Flex ovh className={'overflow-auto flex-auto flex-wrap space-x-2 space-y-2'}>
              {
                PAGE_PRESETS.map((item, index) => {
                  const size = 100
                  const scale = size / Math.max(item.width, item.height)

                  return <Flex col key={index}
                               justifyContent={'center'}
                               alignItems={'center'}
                               w={120}
                               h={120}
                               className={'border overflow-hidden flex text-center   border-gray-200  cursor-pointer hover:border-gray-600'}
                               onClick={() => {
                                 setCurrentPageSet({...item})
                               }}>
                    <Flex col alignItems={'center'} justifyContent={'center'}>
                      <Flex justifyContent={'center'} p={20} w={size} h={size}>
                        <svg style={{
                          width: '100%',
                          height: '100%',
                        }} viewBox={`0 0 ${item.width} ${item.height}`}>
                          <rect width={item.width}
                                height={item.height}
                                strokeWidth={1 / scale}
                                stroke={'black'}
                                fill={'#ffd6d6'}/>
                        </svg>
                      </Flex>
                      <Con p={2} h={30}>{item.name}</Con>
                    </Flex>
                  </Flex>
                })
              }
            </Flex>
          </Con>

          <Con w={'30%'} p={10}>
            <Flex col fh alignItems={'stretch'}>
              <Title h2 className={EDITOR_TEXT_HEADING_CLASS} style={EDITOR_HEADING_STYLE}>Presets</Title>
              <form ref={formRef}
                    className={'h-full relative min-h-30 z-20'}
                    onSubmit={handleSubmit}>
                <Flex col fh justifyContent={'between'} alignItems={'center'}>
                  <Con>
                    <P style={{marginTop: 10}}>File Name</P>
                    <Input name={'filename'}
                           value={currentPageSet.name}
                           onChange={(e) => {
                             handleChange('name', e.target.value)
                           }}
                           type={'text'}/>
                    <P style={{color: 'red'}}>{error}</P>
                    <P style={{marginTop: 10}}>Page Width</P>
                    <Input name={'width'}
                           placeholder="enter page width"
                           value={currentPageSet.width}
                           onChange={(e) => {
                             handleChange('width', e.target.value)
                           }}
                           type={'number'}/>

                    <P style={{marginTop: 10}}>Page Height</P>
                    <Input name={'height'}
                           placeholder="enter page height"
                           value={currentPageSet.height}
                           onChange={(e) => {
                             handleChange('height', e.target.value)
                           }}
                           type={'number'}/>

                    <P style={{marginTop: 10}}>Unit</P>
                    <Select className={EDITOR_TEXT_CONTROL_CLASS}
                            selectValue={currentPageSet.unit}
                            onSelectChange={(v) => {
                              handleNewUnit(v as UnitType)
                            }}
                            placeholderResolver={(value) => String(value)}>
                      <SelectItem className={EDITOR_TEXT_MENU_CLASS} value={'px'}>px</SelectItem>
                      <SelectItem className={EDITOR_TEXT_MENU_CLASS} value={'mm'}>mm</SelectItem>
                      <SelectItem className={EDITOR_TEXT_MENU_CLASS} value={'cm'}>cm</SelectItem>
                      <SelectItem className={EDITOR_TEXT_MENU_CLASS} value={'inches'}>inches</SelectItem>
                    </Select>

                    <P style={{marginTop: 10}}>DPI</P>
                    <Select className={EDITOR_TEXT_CONTROL_CLASS}
                            selectValue={dpi}
                            onSelectChange={(newDpi) => {
                              setDpi(newDpi as number)
                            }}
                            placeholderResolver={(value) => String(value)}>
                      <SelectItem className={EDITOR_TEXT_MENU_CLASS} value={300}>300</SelectItem>
                      <SelectItem className={EDITOR_TEXT_MENU_CLASS} value={96}>96</SelectItem>
                      <SelectItem className={EDITOR_TEXT_MENU_CLASS} value={72}>72</SelectItem>
                    </Select>

                  </Con>

                  <Button primary type={'submit'}>Create File</Button>
                </Flex>
              </form>
            </Flex>
          </Con>
        </Flex>
      </section>
    </Flex>
  </Modal>
}

export default CreateFile
