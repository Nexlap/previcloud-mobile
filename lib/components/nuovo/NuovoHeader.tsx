import { Text, TouchableOpacity, View } from 'react-native'
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
      <TouchableOpacity style={styles.backBtn} onPress={onBack}>
        <Text style={styles.backText}>←</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      {showRicomincia
        ? <TouchableOpacity onPress={onRicomincia}><Text style={styles.nuovoText}>Nuovo</Text></TouchableOpacity>
        : <View style={{ width: 50 }} />
      }
    </View>
  )
}
