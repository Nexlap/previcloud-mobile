import { Text, TouchableOpacity, View } from 'react-native'
import { profiloStyles as styles } from './profiloStyles'

type Props = {
  nomeAzienda: string
  email: string
  onEditSettings: () => void
}

export function ProfiloAvatarCard({ nomeAzienda, email, onEditSettings }: Props) {
  return (
    <View style={styles.profileCard}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{nomeAzienda.charAt(0).toUpperCase() || '?'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.profileName}>{nomeAzienda || 'Nome azienda'}</Text>
        <Text style={styles.profileEmail}>{email}</Text>
      </View>
      <TouchableOpacity onPress={onEditSettings}>
        <Text style={{ fontSize: 20 }}>{'\u270F\uFE0F'}</Text>
      </TouchableOpacity>
    </View>
  )
}
