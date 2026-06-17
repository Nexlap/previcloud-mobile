import { Text, View } from 'react-native'
import { storicoStyles as styles } from './storicoStyles'

export function StoricoHeader() {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Storico preventivi</Text>
    </View>
  )
}
