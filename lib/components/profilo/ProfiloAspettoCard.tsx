import { Text, View } from 'react-native'
import { AppIcon } from '../icons/AppIcon'
import { profiloStyles as styles } from './profiloStyles'

// unused
export function ProfiloAspettoCard() {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Aspetto</Text>
      <View style={styles.settingBtn}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <AppIcon name="moon" size={16} color="#6B7280" />
          <Text style={styles.settingBtnText}>Tema scuro</Text>
        </View>
        <Text style={styles.settingDesc}>Prossimamente</Text>
      </View>
    </View>
  )
}
