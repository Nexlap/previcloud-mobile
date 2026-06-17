import { Text, TouchableOpacity, View } from 'react-native'
import { listinoStyles as styles } from './listinoStyles'

type Props = {
  onAdd: () => void
}

export function ListinoEmpty({ onAdd }: Props) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>{'\uD83D\uDCCB'}</Text>
      <Text style={styles.emptyTitle}>Nessun servizio ancora</Text>
      <Text style={styles.emptySub}>Aggiungi i tuoi servizi con + oppure usa l'AI {'\uD83E\uDD16'}</Text>
      <TouchableOpacity style={styles.emptyBtn} onPress={onAdd}>
        <Text style={styles.emptyBtnText}>+ Aggiungi il primo servizio</Text>
      </TouchableOpacity>
    </View>
  )
}
