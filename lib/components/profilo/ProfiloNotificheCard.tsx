import { Switch, Text, View } from 'react-native'
import { currentUserId } from '../../api/auth'
import { registraPushToken, rimuoviPushToken } from '../../api/pushNotifications'
import { PROFILO_COLORS as C } from '../../features/profilo/constants'
import { profiloStyles as styles } from './profiloStyles'

type Props = {
  notifiche: boolean
  onChangeNotifiche: (value: boolean) => void
}

export function ProfiloNotificheCard({ notifiche, onChangeNotifiche }: Props) {
  async function handleToggle(value: boolean) {
    onChangeNotifiche(value)
    const userId = await currentUserId()
    if (!userId) return
    if (value) {
      await registraPushToken(userId)
    } else {
      await rimuoviPushToken(userId)
    }
  }

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
          onValueChange={handleToggle}
          trackColor={{ false: C.border, true: C.teal }}
          thumbColor="#fff"
        />
      </View>
    </View>
  )
}
