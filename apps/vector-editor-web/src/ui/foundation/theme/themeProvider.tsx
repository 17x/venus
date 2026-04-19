import {createContext, type ReactNode, useContext, useEffect, useMemo, useState} from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedThemeMode = 'light' | 'dark'

export interface ThemePalette {
  primary: string
  primaryHover: string
  primaryForeground: string
  secondary: string
  secondaryHover: string
  secondaryForeground: string
  tertiary: string
  tertiaryHover: string
  tertiaryForeground: string
  thirdly: string
  thirdlyHover: string
  thirdlyForeground: string
  hoverBg: string
  hoverBgStrong: string
}

const THEME_MODE_STORAGE_KEY = 'vector-editor-theme-mode'

const THEME_PALETTES: Record<ResolvedThemeMode, ThemePalette> = {
  light: {
    primary: '#0066c0',
    primaryHover: '#0057a4',
    primaryForeground: '#ffffff',
    secondary: '#3385cf',
    secondaryHover: '#2678c5',
    secondaryForeground: '#ffffff',
    tertiary: '#d9ebf8',
    tertiaryHover: '#c8e0f4',
    tertiaryForeground: '#0f2a44',
    thirdly: '#d9ebf8',
    thirdlyHover: '#c8e0f4',
    thirdlyForeground: '#0f2a44',
    hoverBg: '#f5f5f5',
    hoverBgStrong: '#ebebeb',
  },
  dark: {
    primary: '#4d9ae0',
    primaryHover: '#62a7e6',
    primaryForeground: '#081522',
    secondary: '#2f7fc7',
    secondaryHover: '#4090d8',
    secondaryForeground: '#eef6fc',
    tertiary: '#173b5c',
    tertiaryHover: '#20496f',
    tertiaryForeground: '#d6e8f7',
    thirdly: '#173b5c',
    thirdlyHover: '#20496f',
    thirdlyForeground: '#d6e8f7',
    hoverBg: '#1a2330',
    hoverBgStrong: '#243041',
  },
}

interface ThemeContextValue {
  mode: ThemeMode
  resolvedMode: ResolvedThemeMode
  colors: ThemePalette
  palettes: Record<ResolvedThemeMode, ThemePalette>
  setMode: (mode: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system'
}

function resolveSystemMode(): ResolvedThemeMode {
  if (typeof window === 'undefined') {
    return 'light'
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveInitialMode(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'system'
  }

  const stored = window.localStorage.getItem(THEME_MODE_STORAGE_KEY)
  return isThemeMode(stored) ? stored : 'system'
}

export function ThemeProvider(props: {children: ReactNode}) {
  const [mode, setMode] = useState<ThemeMode>(() => resolveInitialMode())
  const [systemMode, setSystemMode] = useState<ResolvedThemeMode>(() => resolveSystemMode())

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () => {
      setSystemMode(media.matches ? 'dark' : 'light')
    }

    update()
    media.addEventListener('change', update)

    return () => {
      media.removeEventListener('change', update)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    window.localStorage.setItem(THEME_MODE_STORAGE_KEY, mode)
  }, [mode])

  const resolvedMode: ResolvedThemeMode = mode === 'system' ? systemMode : mode

  const value = useMemo<ThemeContextValue>(() => ({
    mode,
    resolvedMode,
    colors: THEME_PALETTES[resolvedMode],
    palettes: THEME_PALETTES,
    setMode,
  }), [mode, resolvedMode])

  return (
    <ThemeContext.Provider value={value}>
      {props.children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
