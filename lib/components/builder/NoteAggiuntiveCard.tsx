import { StyleSheet, TextInput, View } from 'react-native'
import { PLACEHOLDER } from '../../placeholders'
import { BuilderSectionHeader, builderCardStyles } from './BuilderSectionHeader'

type Props = {
  noteExtra: string
  setNoteExtra: (value: string) => void
  onInputFocus?: () => void
}

export function NoteAggiuntiveCard({ noteExtra, setNoteExtra, onInputFocus }: Props) {
  return (
    <View style={builderCardStyles.card}>
      <BuilderSectionHeader
        icon="edit-3"
        title="Note"
        subtitle="Dettagli aggiuntivi da inserire nel preventivo"
      />
      <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
        value={noteExtra} onChangeText={setNoteExtra}
        onFocus={onInputFocus}
        placeholder={PLACEHOLDER.notePreventivo}
        placeholderTextColor="#9CA3AF" multiline />
    </View>
  )
}

const styles = StyleSheet.create({
  input: { backgroundColor: '#F7F8FA', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 12, fontSize: 14, color: '#0D1B2A' },
})
