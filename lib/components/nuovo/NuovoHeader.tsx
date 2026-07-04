import { Text, TouchableOpacity, View } from 'react-native'
import { AppIcon } from '../icons/AppIcon'
import { nuovoStyles as styles } from './nuovoStyles'

type Props = {
  title: string
  showRicomincia: boolean
  onBack: () => void
  onRicomincia: () => void
}

export function NuovoHeader({ title, showRicomincia, onBack, onRicomincia }: Props) {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack} accessibilityRole="button" accessibilityLabel="Indietro" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <AppIcon name="arrow-left" size={22} color="#9CA3AF" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      {showRicomincia
        ? <TouchableOpacity onPress={onRicomincia}><Text style={styles.nuovoText}>Nuovo</Text></TouchableOpacity>
        : <View style={{ width: 50 }} />
      }
    </View>
  )
}
