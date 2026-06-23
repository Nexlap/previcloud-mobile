import { Switch, Text, View } from 'react-native'
import { useTheme } from '../../theme/ThemeContext'
import { AppIcon } from '../icons/AppIcon'
import { settingsStyles as styles } from './settingsStyles'

// unused
export function SettingsThemeCard() {
  const { isDark, setDark, colors } = useTheme()

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>Aspetto</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <AppIcon name="moon" size={18} color={colors.icon} />
          <View>
            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }}>Tema scuro</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>Interfaccia scura per uso notturno</Text>
          </View>
        </View>
        <Switch
          value={isDark}
          onValueChange={v => void setDark(v)}
          trackColor={{ false: '#D1D5DB', true: '#0E9F8E' }}
          thumbColor="#fff"
        />
      </View>
    </View>
  )
}
