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
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.profileName} numberOfLines={1}>{nomeAzienda || 'Nome azienda'}</Text>
        <Text style={styles.profileEmail} numberOfLines={1}>{email}</Text>
      </View>
      <TouchableOpacity style={styles.editBtn} onPress={onEditSettings}>
        <Text style={styles.editBtnText}>Modifica</Text>
      </TouchableOpacity>
    </View>
  )
}
