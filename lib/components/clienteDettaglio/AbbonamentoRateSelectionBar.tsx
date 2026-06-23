import { Text, TouchableOpacity, View } from 'react-native'
import { IconLabel } from '../icons/IconLabel'
import { abbonamentoSelectionStyles as styles } from './abbonamentoSelectionStyles'

type Props = {
  count: number
  countLabel?: string
  onCancel: () => void
  onDelete: () => void
}

// unused
export function AbbonamentoRateSelectionBar({ count, countLabel = 'selezionate', onCancel, onDelete }: Props) {
  return (
    <View style={styles.selectionBar}>
      <View style={styles.selectionTopRow}>
        <Text style={styles.selectionCount}>{`${count} ${countLabel}`}</Text>
        <TouchableOpacity onPress={onCancel}>
          <Text style={styles.selectionCancel}>Annulla</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.selectionActions}>
        <TouchableOpacity style={styles.selectionActionBtn} onPress={onDelete}>
          <IconLabel icon="trash-2" label="Elimina" color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  )
}
