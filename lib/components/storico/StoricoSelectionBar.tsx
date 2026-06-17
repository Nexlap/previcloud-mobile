import { Text, TouchableOpacity, View } from 'react-native'
import { storicoStyles as styles } from './storicoStyles'

type Props = {
  count: number
  onCancel: () => void
  onDelete: () => void
  onChangeStato: () => void
  onShare: () => void
  onMove: () => void
}

export function StoricoSelectionBar({ count, onCancel, onDelete, onChangeStato, onShare, onMove }: Props) {
  return (
    <View style={styles.selectionBar}>
      <View style={styles.selectionTopRow}>
        <Text style={styles.selectionCount}>{count} selezionati</Text>
        <TouchableOpacity onPress={onCancel}>
          <Text style={styles.selectionCancel}>{'\u2715'} Annulla</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.selectionActions}>
        <TouchableOpacity style={styles.selectionActionBtn} onPress={onDelete}>
          <Text style={styles.selectionActionText}>{'\uD83D\uDDD1'} Elimina</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.selectionActionBtn} onPress={onChangeStato}>
          <Text style={styles.selectionActionText}>{'\uD83D\uDD04'} Cambia stato</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.selectionActionBtn} onPress={onShare}>
          <Text style={styles.selectionActionText}>{'\uD83D\uDCE4'} Condividi</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.selectionActionBtn} onPress={onMove}>
          <Text style={styles.selectionActionText}>{'\uD83D\uDCC1'} Sposta</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
