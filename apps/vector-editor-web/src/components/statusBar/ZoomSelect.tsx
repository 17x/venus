import React, {useEffect, useRef, useState} from 'react'
import ZOOM_LEVELS from '../../constants/zoomLevels.ts'
import {Row, Select, SelectItem} from '@lite-u/ui'

export type ZoomLevels = {
  label: string,
  value: number | 'fit'
}

const fixNumber = (i: number) => {
  return (i * 100).toFixed(2) + '%'
}

const resolveNumber = (value: string): number | false => {
  const str = value.replace('%', '').trim()
  const numeric = Number(str)

  if (!isNaN(numeric)) {
    return Number(numeric.toFixed(2))
  }

  return false
}

const ZoomSelect: React.FC<{ scale: number, onChange: (newScale: number | 'fit') => void }> = ({scale, onChange}) => {
  const [inputValue, setInputValue] = useState<string>(fixNumber(1))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const v = fixNumber(scale)

    if (inputRef.current) {
      inputRef.current.value = v
    }

    setInputValue(v)
  }, [scale])

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const v = resolveNumber((e.target as HTMLInputElement).value)

      if (v !== false) {
        onChange(v)
      }
      inputRef.current!.blur()
    }

    e.stopPropagation()
  }
  // console.log(scale)
  return <Row w={20} h={30} ml={5} js center rela>
    <Select s
            selectValue={scale}
            onSelectChange={v => {
              onChange(v as number | 'fit')
            }}
            placeholderResolver={(value) => {
              if (value === 'fit') return 'Fit'
              return fixNumber(Number(value))
            }}>
      {
        ZOOM_LEVELS.map(({label, value}) => <SelectItem key={value} value={value}>{label}</SelectItem>)
      }
    </Select>

    <input
      type="text"
      ref={inputRef}
      onChange={void 0}
      defaultValue={inputValue}
      onKeyDown={onKeyDown}
      className="w-20 h-5 text-sm bg-gray-100 text-center overflow-hidden "
      placeholder="Enter zoom %"
    />
  </Row>

  // </div>
}

export default ZoomSelect
