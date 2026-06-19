import { Text, TouchableOpacity, View } from 'react-native'
import { IconLabel } from '../icons/IconLabel'
import { listinoStyles as styles } from './listinoStyles'

type Props = {
  count: number
  onCancel: () => void
  onDelete: () => void
}

export function ListinoSelectionBar({ count, onCancel, onDelete }: Props) {
  return (
    <View style={styles.selectionBar}>
      <View style={styles.selectionTopRow}>
        <Text style={styles.selectionCount}>{count} selezionati</Text>
        <TouchableOpacity onPress={onCancel}>
          <Text style={styles.selectionCancel}>Annulla</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.selectionActions}>
        <TouchableOpacity style={styles.selectionActionBtn} onPress={onDelete}>
          <IconLabel icon="trash-2" label="Elimina" danger />
        </TouchableOpacity>
      </View>
    </View>
  )
}
