import { StyleSheet } from 'react-native'
import { useTheme } from '../theme/ThemeContext'

/** Stili condivisi per le schermate tab (Home, Storico, Clienti, …). */
export function useScreenTheme() {
  const { colors, isDark } = useTheme()

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardLg: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    title: { fontSize: 15, fontWeight: '600', color: colors.text },
    text: { color: colors.text },
    textMuted: { color: colors.textMuted },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: isDark ? colors.border : '#F3F4F6' },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
    },
    searchInput: { flex: 1, fontSize: 14, color: colors.text },
    avatar: {
      backgroundColor: isDark ? 'rgba(14,159,142,0.18)' : '#F0FDF4',
      justifyContent: 'center',
      alignItems: 'center',
    },
    quickCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 16,
      paddingHorizontal: 10,
      paddingVertical: 14,
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: colors.border,
      minWidth: 0,
    },
  })

  return { colors, isDark, s }
}
