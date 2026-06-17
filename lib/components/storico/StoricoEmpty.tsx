import { Text, TouchableOpacity, View } from 'react-native'
import { storicoStyles as styles } from './storicoStyles'

type Props = {
  onGeneraPrimo: () => void
}

export function StoricoEmpty({ onGeneraPrimo }: Props) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>Nessun preventivo salvato.</Text>
      <TouchableOpacity style={styles.emptyBtn} onPress={onGeneraPrimo}>
        <Text style={styles.emptyBtnText}>Genera il primo</Text>
      </TouchableOpacity>
    </View>
  )
}
