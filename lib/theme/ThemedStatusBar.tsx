import { StatusBar } from 'expo-status-bar'
import { useTheme } from './ThemeContext'

export function ThemedStatusBar() {
  const { isDark } = useTheme()
  return <StatusBar style={isDark ? 'light' : 'dark'} />
}
