import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AppIcon } from '../icons/AppIcon'

type Props = {
  onBack: () => void
  onRipristina: () => void
}

export function BuilderHeader({ onBack, onRipristina }: Props) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <AppIcon name="chevron-left" size={24} color="#9CA3AF" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Builder preventivo</Text>
      <TouchableOpacity onPress={onRipristina} style={styles.ripristinaBtn}>
        <AppIcon name="rotate-ccw" size={14} color="#9CA3AF" />
        <Text style={styles.ripristinaText}>Ripristina</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#0D1B2A', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { padding: 4, width: 50 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  ripristinaBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
  ripristinaText: { color: '#9CA3AF', fontSize: 13 },
})
