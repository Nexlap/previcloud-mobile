import { ActivityIndicator, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { UNITA_OPTIONS } from '../../features/listino/constants'
import { listinoStyles as styles } from './listinoStyles'

export type ServizioDraft = {
  nome: string
  descrizione: string
  costo: string
  unita: string
}

type Props = {
  visible: boolean
  isEdit: boolean
  draft: ServizioDraft
  salvando: boolean
  onClose: () => void
  onSave: () => void
  onChange: (updater: (prev: ServizioDraft) => ServizioDraft) => void
}

export function ListinoServizioModal({ visible, isEdit, draft, salvando, onClose, onSave, onChange }: Props) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalClose}>{'\u2715'}</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{isEdit ? 'Modifica servizio' : 'Nuovo servizio'}</Text>
          <TouchableOpacity onPress={onSave} disabled={salvando}>
            {salvando
              ? <ActivityIndicator color="#0E9F8E" size="small" />
              : <Text style={styles.modalSave}>Salva</Text>
            }
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>NOME SERVIZIO *</Text>
            <TextInput style={styles.fieldInput} value={draft.nome} onChangeText={v => onChange(s => ({ ...s, nome: v }))} placeholder="es. Editing video" placeholderTextColor="#9CA3AF" autoFocus />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>DESCRIZIONE</Text>
            <TextInput style={[styles.fieldInput, { height: 80, textAlignVertical: 'top' }]} value={draft.descrizione} onChangeText={v => onChange(s => ({ ...s, descrizione: v }))} placeholder="es. Montaggio con musica e sottotitoli" placeholderTextColor="#9CA3AF" multiline />
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={styles.fieldLabel}>COSTO ({'\u20AC'})</Text>
              <TextInput style={styles.fieldInput} value={draft.costo} onChangeText={v => onChange(s => ({ ...s, costo: v }))} placeholder="es. 500" placeholderTextColor="#9CA3AF" keyboardType="decimal-pad" />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={styles.fieldLabel}>UNITÀ</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {UNITA_OPTIONS.map(u => (
                  <TouchableOpacity key={u} style={[styles.unitaChip, draft.unita === u && styles.unitaChipActive]} onPress={() => onChange(s => ({ ...s, unita: u }))}>
                    <Text style={[styles.unitaChipText, draft.unita === u && styles.unitaChipTextActive]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
          {draft.nome ? (
            <View style={styles.previewBox}>
              <Text style={styles.previewLabel}>ANTEPRIMA</Text>
              <Text style={styles.previewNome}>{draft.nome}</Text>
              {draft.descrizione ? <Text style={styles.previewDesc}>{draft.descrizione}</Text> : null}
              {draft.costo ? <Text style={styles.previewCosto}>{`\u20AC${draft.costo} / ${draft.unita}`}</Text> : null}
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  )
}
