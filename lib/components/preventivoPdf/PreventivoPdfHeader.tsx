import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

type Props = {
  onBack: () => void
}

export function PreventivoPdfHeader({ onBack }: Props) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>{'\u2190'}</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Preventivo</Text>
      <View style={{ width: 50 }} />
    </View>
  )
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#0D1B2A', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { padding: 4, width: 50 },
  backText: { color: '#9CA3AF', fontSize: 22 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
