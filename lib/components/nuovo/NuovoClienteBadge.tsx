import { Text, TouchableOpacity, View } from 'react-native'
import { ClienteRilevato } from '../../features/nuovo/types'
import { AppIcon } from '../icons/AppIcon'
import { nuovoStyles as styles } from './nuovoStyles'

type Props = {
  cliente: ClienteRilevato
  onRimuovi: () => void
}

export function NuovoClienteBadge({ cliente, onRimuovi }: Props) {
  return (
    <View style={styles.clienteRilevatoBadge}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <AppIcon name="user" size={13} color="#0B7A6D" />
        <Text style={styles.clienteRilevatoBadgeText}>{cliente.nome}</Text>
      </View>
      <TouchableOpacity onPress={onRimuovi} accessibilityRole="button" accessibilityLabel="Rimuovi cliente" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <AppIcon name="x" size={14} color="#0B7A6D" />
      </TouchableOpacity>
    </View>
  )
}
