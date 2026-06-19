import { useTheme } from '../theme/ThemeContext'

export function useSettingsTheme() {
  const { colors, isDark } = useTheme()
  return {
    card: { backgroundColor: colors.surface, borderColor: colors.border },
    input: {
      backgroundColor: isDark ? '#0B1220' : '#F7F8FA',
      color: colors.text,
      borderColor: colors.border,
    },
    title: { color: colors.text },
    sub: { color: colors.textMuted },
    label: { color: colors.textMuted },
    navIconBg: { backgroundColor: isDark ? '#0B1220' : '#F7F8FA' },
    icon: colors.icon,
  }
}
