import { useTheme } from '../theme/ThemeContext'

/** Stili dinamici per la lista Storico (tema chiaro/scuro). */
export function useStoricoTheme() {
  const { colors, isDark } = useTheme()

  return {
    colors,
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.2 : 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    cardSelected: {
      borderColor: colors.accent,
      backgroundColor: isDark ? 'rgba(14,159,142,0.12)' : '#F0FDF4',
    },
    text: { color: colors.text },
    textMuted: { color: colors.textMuted },
    detailBorder: { borderTopColor: isDark ? colors.border : '#F3F4F6' },
    detailText: { color: colors.textMuted },
    cronologiaItem: {
      backgroundColor: isDark ? colors.bg : '#F7F8FA',
    },
    statoDropdown: {
      backgroundColor: isDark ? colors.bg : '#F7F8FA',
      borderColor: colors.border,
    },
    statoDropdownVal: { color: colors.text },
    statoDropdownText: { color: colors.textMuted },
  }
}
