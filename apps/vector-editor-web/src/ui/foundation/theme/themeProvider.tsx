import {createContext, type ReactNode, useContext, useEffect, useMemo, useState} from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedThemeMode = 'light' | 'dark'

const THEME_MODE_STORAGE_KEY = 'venus-editor-theme-mode'

interface ThemeContextValue {
  mode: ThemeMode
  resolvedMode: ResolvedThemeMode
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
