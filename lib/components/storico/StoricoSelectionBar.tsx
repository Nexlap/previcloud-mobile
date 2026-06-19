import { Text, TouchableOpacity, View } from 'react-native'
import { IconLabel } from '../icons/IconLabel'
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
          <Text style={styles.selectionCancelText}>Annulla</Text>
        </TouchableOpacity>
        <Text style={styles.selectionCount}>{count} selezionati</Text>
      </View>

      <View style={styles.selectionActions}>
        <TouchableOpacity style={styles.selectionAction} onPress={onMove}>
          <IconLabel icon="folder" label="Sposta" color="#0D1B2A" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.selectionAction} onPress={onShare}>
          <IconLabel icon="share-2" label="Condividi" color="#0D1B2A" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.selectionAction, styles.selectionActionDelete]} onPress={onDelete}>
          <IconLabel icon="trash-2" label="Elimina" danger />
        </TouchableOpacity>
      </View>
    </View>
  )
}
