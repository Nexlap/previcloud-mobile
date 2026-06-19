import { Text, View } from 'react-native'
import { settingsStyles as styles } from './settingsStyles'

export function SettingsHeader() {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Impostazioni</Text>
      <Text style={styles.headerSub}>Dati azienda usati nei preventivi</Text>
    </View>
  )
}
