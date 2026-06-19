import { Text, TouchableOpacity, View } from 'react-native'
import { AppIcon } from '../icons/AppIcon'
import { profiloStyles as styles } from './profiloStyles'

type Props = {
  onSegnala: () => void
}

export function ProfiloFeedbackCard({ onSegnala }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Aiuto e feedback</Text>
      <Text style={styles.cardSub}>
        Segnala un bug o suggerisci un miglioramento. La schermata attuale viene compilata automaticamente.
      </Text>
      <TouchableOpacity style={styles.actionBtn} onPress={onSegnala}>
        <AppIcon name="alert-triangle" size={16} color="#0D1B2A" />
        <Text style={styles.actionBtnText}>Segnala un problema</Text>
      </TouchableOpacity>
    </View>
  )
}
