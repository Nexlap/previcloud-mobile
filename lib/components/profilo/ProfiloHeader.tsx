import { Text, TouchableOpacity, View } from 'react-native'
import { profiloStyles as styles } from './profiloStyles'

type Props = {
  onBack: () => void
}

export function ProfiloHeader({ onBack }: Props) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>{'\u2190'}</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Profilo</Text>
      <View style={{ width: 50 }} />
    </View>
  )
}
