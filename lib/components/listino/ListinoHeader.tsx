import { Text, TouchableOpacity, View } from 'react-native'
import { listinoStyles as styles } from './listinoStyles'
import { AppIcon } from '../icons/AppIcon'

type Props = {
  onBack: () => void
  onOpenAi: () => void
  onAdd: () => void
}

export function ListinoHeader({ onBack, onOpenAi, onAdd }: Props) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <AppIcon name="arrow-left" size={20} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>I miei servizi</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity style={styles.headerAiBtn} onPress={onOpenAi}>
          <AppIcon name="cpu" size={18} color="#0E9F8E" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerAddBtn} onPress={onAdd}>
          <Text style={styles.headerAddBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
