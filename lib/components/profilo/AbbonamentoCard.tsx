import { Text, View } from 'react-native'
import { PROFILO_COLORS as C } from '../../features/profilo/constants'
import { profiloStyles as styles } from './profiloStyles'
import { formatDataBreve } from 'previcloud-shared'

type Props = {
  plan: string | null
  trialEndsAt: string | null
}

export function AbbonamentoCard({ plan, trialEndsAt }: Props) {
  if (plan !== 'beta' || !trialEndsAt) return null
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Abbonamento</Text>
      <View style={styles.settingRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.settingLabel}>Piano BETA</Text>
          <Text style={styles.settingDesc}>
            Scadenza: {formatDataBreve(trialEndsAt)}
          </Text>
        </View>
      </View>
    </View>
  )
}
