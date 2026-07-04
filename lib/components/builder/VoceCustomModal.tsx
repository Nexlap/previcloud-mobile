import { Dispatch, SetStateAction } from 'react'
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native'

type VoceCustom = {
  nome: string
  descrizione: string
  costo: string
  quantita: string
  unita: string
  salvaNelListino: boolean
}

type Props = {
  visible: boolean
  voceCustom: VoceCustom
  salvando: boolean
  onClose: () => void
  onConfirm: () => void
  setVoceCustom: Dispatch<SetStateAction<VoceCustom>>
}

const UNITA = ['cad', 'ora', 'giorno', 'mq', 'ml', 'set', 'progetto']

export function VoceCustomModal({ visible, voceCustom, salvando, onClose, onConfirm, setVoceCustom }: Props) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalClose}>Chiudi</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Voce personalizzata</Text>
          <TouchableOpacity onPress={onConfirm} disabled={salvando}>
            {salvando ? <ActivityIndicator color="#0E9F8E" size="small" /> : <Text style={styles.modalSave}>Aggiungi</Text>}
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          <View style={{ gap: 6 }}>
            <Text style={styles.modalFieldLabel}>NOME SERVIZIO *</Text>
            <TextInput style={styles.modalFieldInput} value={voceCustom.nome} onChangeText={v => setVoceCustom(s => ({ ...s, nome: v }))} placeholder="es. Consulenza extra" placeholderTextColor="#9CA3AF" autoFocus />
          </View>
          <View style={{ gap: 6 }}>
            <Text style={styles.modalFieldLabel}>DESCRIZIONE</Text>
            <TextInput style={[styles.modalFieldInput, { height: 90, textAlignVertical: 'top' }]} value={voceCustom.descrizione} onChangeText={v => setVoceCustom(s => ({ ...s, descrizione: v }))} placeholder="Dettagli opzionali" placeholderTextColor="#9CA3AF" multiline />
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={styles.modalFieldLabel}>QUANTITA'</Text>
              <TextInput style={styles.modalFieldInput} value={voceCustom.quantita} onChangeText={v => setVoceCustom(s => ({ ...s, quantita: v }))} placeholder="1" placeholderTextColor="#9CA3AF" keyboardType="decimal-pad" />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={styles.modalFieldLabel}>PREZZO</Text>
              <TextInput style={styles.modalFieldInput} value={voceCustom.costo} onChangeText={v => setVoceCustom(s => ({ ...s, costo: v }))} placeholder="es. 250" placeholderTextColor="#9CA3AF" keyboardType="decimal-pad" />
            </View>
          </View>
          <View style={{ gap: 8 }}>
            <Text style={styles.modalFieldLabel}>UNITA'</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {UNITA.map(u => (
                <TouchableOpacity key={u} style={[styles.unitaChip, voceCustom.unita === u && styles.unitaChipActive]} onPress={() => setVoceCustom(s => ({ ...s, unita: u }))}>
                  <Text style={[styles.unitaChipText, voceCustom.unita === u && styles.unitaChipTextActive]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.saveListinoRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.saveListinoTitle}>Salva nel mio listino</Text>
              <Text style={styles.saveListinoSub}>La voce resta usa e getta se lasci spento</Text>
            </View>
            <Switch value={voceCustom.salvaNelListino} onValueChange={v => setVoceCustom(s => ({ ...s, salvaNelListino: v }))} trackColor={{ false: '#E5E7EB', true: '#0E9F8E' }} thumbColor="#fff" />
          </View>
        </ScrollView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: '#F7F8FA' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56, backgroundColor: '#0D1B2A' },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalClose: { color: '#9CA3AF', fontSize: 20 },
  modalFieldLabel: { fontSize: 11, fontWeight: '600' as const, color: '#9CA3AF', letterSpacing: 0.8 },
  modalFieldInput: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 12, fontSize: 14, color: '#0D1B2A' },
  modalSave: { color: '#0B7A6D', fontSize: 15, fontWeight: '600' },
  unitaChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff' },
  unitaChipActive: { backgroundColor: '#0D1B2A', borderColor: '#0D1B2A' },
  unitaChipText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  unitaChipTextActive: { color: '#fff' },
  saveListinoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  saveListinoTitle: { fontSize: 14, fontWeight: '600', color: '#0D1B2A' },
  saveListinoSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
})
