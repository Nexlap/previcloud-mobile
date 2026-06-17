import { StyleSheet, Text, TextInput, View } from 'react-native'

type Props = {
  noteExtra: string
  setNoteExtra: (value: string) => void
  onInputFocus?: () => void
}

export function NoteAggiuntiveCard({ noteExtra, setNoteExtra, onInputFocus }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Note aggiuntive</Text>
      <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
        value={noteExtra} onChangeText={setNoteExtra}
        onFocus={onInputFocus}
        placeholder="es. Incluso trasferta, pagamento 50% anticipato..."
        placeholderTextColor="#9CA3AF" multiline />
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#0D1B2A' },
  input: { backgroundColor: '#F7F8FA', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 12, fontSize: 14, color: '#0D1B2A' },
})
