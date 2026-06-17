import { Switch, Text, View } from 'react-native'
import { PROFILO_COLORS as C } from '../../features/profilo/constants'
import { profiloStyles as styles } from './profiloStyles'

type Props = {
  notifiche: boolean
  onChangeNotifiche: (value: boolean) => void
}

export function ProfiloNotificheCard({ notifiche, onChangeNotifiche }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Notifiche</Text>
      <View style={styles.settingRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.settingLabel}>Notifiche push</Text>
          <Text style={styles.settingDesc}>Promemoria e aggiornamenti</Text>
        </View>
        <Switch
          value={notifiche}
          onValueChange={onChangeNotifiche}
          trackColor={{ false: C.border, true: C.teal }}
          thumbColor="#fff"
        />
      </View>
    </View>
  )
}
