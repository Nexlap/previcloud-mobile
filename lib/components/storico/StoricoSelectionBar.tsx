import { Text, TouchableOpacity, View } from 'react-native'
import { storicoStyles as styles } from './storicoStyles'

type Props = {
  count: number
  onCancel: () => void
  onDelete: () => void
  onShare: () => void
  onMove: () => void
}

export function StoricoSelectionBar({ count, onCancel, onDelete, onShare, onMove }: Props) {
  return (
    <View style={styles.selectionBar}>
      <View style={styles.selectionTopRow}>
        <TouchableOpacity onPress={onCancel} style={styles.selectionCancel}>
          <Text style={styles.selectionCancelText}>{'\u2715'}</Text>
        </TouchableOpacity>
        <Text style={styles.selectionCount}>{count} selezionati</Text>
      </View>

      <View style={styles.selectionActions}>
        <TouchableOpacity style={styles.selectionAction} onPress={onMove}>
          <Text style={styles.selectionActionText}>{'\u2197'} Sposta</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.selectionAction} onPress={onShare}>
          <Text style={styles.selectionActionText}>{'\uD83D\uDCE4'} Condividi</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.selectionAction, styles.selectionActionDelete]} onPress={onDelete}>
          <Text style={[styles.selectionActionText, styles.selectionActionDeleteText]}>{'\uD83D\uDDD1'} Elimina</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
