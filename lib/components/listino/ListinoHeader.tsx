import { Text, TouchableOpacity, View } from 'react-native'
import { listinoStyles as styles } from './listinoStyles'

type Props = {
  onBack: () => void
  onOpenAi: () => void
  onAdd: () => void
}

export function ListinoHeader({ onBack, onOpenAi, onAdd }: Props) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>{'\u2190'}</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>I miei servizi</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity style={styles.headerAiBtn} onPress={onOpenAi}>
          <Text style={{ fontSize: 16 }}>{'\uD83E\uDD16'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerAddBtn} onPress={onAdd}>
          <Text style={styles.headerAddBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
