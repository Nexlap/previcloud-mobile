import { Text, View } from 'react-native'
import { NotificheBell } from '../firma/NotificheBell'
import { ProfileMenuButton } from '../ProfileMenuButton'
import { storicoStyles as styles } from './storicoStyles'

export function StoricoHeader() {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Storico preventivi</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <NotificheBell iconColor="#fff" />
        <ProfileMenuButton />
      </View>
    </View>
  )
}
