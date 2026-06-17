import { Text, View } from 'react-native'
import { profiloStyles as styles } from './profiloStyles'

export function ProfiloAspettoCard() {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Aspetto</Text>
      <View style={styles.settingBtn}>
        <Text style={styles.settingBtnText}>{'\uD83C\uDFA8'} Tema scuro</Text>
        <Text style={styles.settingDesc}>Prossimamente</Text>
      </View>
    </View>
  )
}
