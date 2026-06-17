import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

type Props = {
  onBack: () => void
  onRipristina: () => void
}

export function BuilderHeader({ onBack, onRipristina }: Props) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>←</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Builder preventivo</Text>
      <TouchableOpacity onPress={onRipristina}>
        <Text style={{ color: '#9CA3AF', fontSize: 13 }}>🗑 Ripristina</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#0D1B2A', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { padding: 4, width: 50 },
  backText: { color: '#9CA3AF', fontSize: 22 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
