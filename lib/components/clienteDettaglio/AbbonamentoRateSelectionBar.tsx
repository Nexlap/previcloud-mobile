import { Text, TouchableOpacity, View } from 'react-native'
import { abbonamentoSelectionStyles as styles } from './abbonamentoSelectionStyles'

type Props = {
  count: number
  countLabel?: string
  onCancel: () => void
  onDelete: () => void
}

export function AbbonamentoRateSelectionBar({ count, countLabel = 'selezionate', onCancel, onDelete }: Props) {
  return (
    <View style={styles.selectionBar}>
      <View style={styles.selectionTopRow}>
        <Text style={styles.selectionCount}>{`${count} ${countLabel}`}</Text>
        <TouchableOpacity onPress={onCancel}>
          <Text style={styles.selectionCancel}>{'\u2715'} Annulla</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.selectionActions}>
        <TouchableOpacity style={styles.selectionActionBtn} onPress={onDelete}>
          <Text style={styles.selectionActionText}>{'\uD83D\uDDD1'} Elimina</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
