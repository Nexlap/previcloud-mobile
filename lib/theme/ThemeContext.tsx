import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'preventivoai-theme'

export type ThemeColors = {
  bg: string
  surface: string
  text: string
  textMuted: string
  border: string
  tabBar: string
  tabBarBorder: string
  tabInactive: string
  tabActive: string
  icon: string
}

const LIGHT: ThemeColors = {
  bg: '#F7F8FA',
  surface: '#FFFFFF',
  text: '#0D1B2A',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  tabBar: '#FFFFFF',
  tabBarBorder: '#F3F4F6',
  tabInactive: '#9CA3AF',
  tabActive: '#0D1B2A',
  icon: '#6B7280',
}

const DARK: ThemeColors = {
  bg: '#0B1220',
  surface: '#151F2E',
  text: '#E8EEF5',
  textMuted: '#94A3B8',
  border: '#2A3548',
  tabBar: '#111827',
  tabBarBorder: '#1F2937',
  tabInactive: '#64748B',
  tabActive: '#F1F5F9',
  icon: '#94A3B8',
}

type ThemeContextValue = {
  isDark: boolean
  colors: ThemeColors
  setDark: (enabled: boolean) => Promise<void>
  ready: boolean
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw === 'dark') setIsDark(true)
      setReady(true)
    })
  }, [])

  const setDark = useCallback(async (enabled: boolean) => {
    setIsDark(enabled)
    await AsyncStorage.setItem(STORAGE_KEY, enabled ? 'dark' : 'light')
  }, [])

  const value = useMemo(
    () => ({ isDark, colors: isDark ? DARK : LIGHT, setDark, ready }),
    [isDark, setDark, ready],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
