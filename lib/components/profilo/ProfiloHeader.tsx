import { Text, TouchableOpacity, View } from 'react-native'
import { AppIcon } from '../icons/AppIcon'
import { profiloStyles as styles } from './profiloStyles'

type Props = {
  onBack: () => void
}

export function ProfiloHeader({ onBack }: Props) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <AppIcon name="arrow-left" size={20} color="#9CA3AF" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Profilo</Text>
      <View style={{ width: 50 }} />
    </View>
  )
}
