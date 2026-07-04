import { useTheme } from '../theme/ThemeContext'

export function useSettingsTheme() {
  const { colors, isDark } = useTheme()
  return {
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.2 : 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
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
