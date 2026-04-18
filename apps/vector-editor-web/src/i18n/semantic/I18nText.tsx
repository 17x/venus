import type {ReactNode} from 'react'
import {useI18n} from './useI18n.ts'
import type {EditorI18nKey} from './types.ts'

interface I18nTextProps {
  k: EditorI18nKey
  fallback?: string
  values?: Record<string, unknown>
  children?: ReactNode
}

export function I18nText(props: I18nTextProps) {
  const {tKey} = useI18n()

  return <>{tKey(props.k, {fallback: props.fallback, values: props.values})}</>
}
