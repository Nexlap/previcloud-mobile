import { Text, TouchableOpacity, View } from 'react-native'
import { useStoricoTheme } from '../../hooks/useStoricoTheme'
import { storicoStyles as styles } from './storicoStyles'

type Props = {
  onGeneraPrimo: () => void
}

export function StoricoEmpty({ onGeneraPrimo }: Props) {
  const th = useStoricoTheme()

  return (
    <View style={styles.empty}>
      <Text style={[styles.emptyText, th.textMuted]}>Nessun preventivo salvato.</Text>
      <TouchableOpacity style={styles.emptyBtn} onPress={onGeneraPrimo}>
        <Text style={styles.emptyBtnText}>Genera il primo</Text>
      </TouchableOpacity>
    </View>
  )
}
