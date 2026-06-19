import { Text, TouchableOpacity, View } from 'react-native'
import { useScreenTheme } from '../../hooks/useScreenTheme'
import { AppIcon } from '../icons/AppIcon'
import { listinoStyles as styles } from './listinoStyles'

type Props = {
  onAdd: () => void
}

export function ListinoEmpty({ onAdd }: Props) {
  const { colors } = useScreenTheme()

  return (
    <View style={styles.empty}>
      <AppIcon name="list" size={40} color={colors.icon} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>Nessun servizio ancora</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 4 }}>
        <Text style={[styles.emptySub, { color: colors.textMuted }]}>Aggiungi i tuoi servizi con + oppure usa l'AI</Text>
        <AppIcon name="cpu" size={14} color={colors.icon} />
      </View>
      <TouchableOpacity style={styles.emptyBtn} onPress={onAdd}>
        <Text style={styles.emptyBtnText}>+ Aggiungi il primo servizio</Text>
      </TouchableOpacity>
    </View>
  )
}
