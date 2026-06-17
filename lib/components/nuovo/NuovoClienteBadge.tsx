import { Text, TouchableOpacity, View } from 'react-native'
import { ClienteRilevato } from '../../features/nuovo/types'
import { nuovoStyles as styles } from './nuovoStyles'

type Props = {
  cliente: ClienteRilevato
  onRimuovi: () => void
}

export function NuovoClienteBadge({ cliente, onRimuovi }: Props) {
  return (
    <View style={styles.clienteRilevatoBadge}>
      <Text style={styles.clienteRilevatoBadgeText}>{`👤 ${cliente.nome}`}</Text>
      <TouchableOpacity onPress={onRimuovi}>
        <Text style={styles.clienteRilevatoBadgeRemove}>✕</Text>
      </TouchableOpacity>
    </View>
  )
}
