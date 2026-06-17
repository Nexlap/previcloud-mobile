import { ActivityIndicator, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SEGNALAZIONE_TIPI } from '../../features/settings/constants'
import { settingsStyles as styles } from './settingsStyles'

export type SegnalazioneForm = {
  tipo: string
  titolo: string
  descrizione: string
  schermata: string
}

type Props = {
  visible: boolean
  segnalazione: SegnalazioneForm
  inviando: boolean
  onClose: () => void
  onChange: (updater: (prev: SegnalazioneForm) => SegnalazioneForm) => void
  onInvia: () => void
}

export function SettingsSegnalazioneModal({ visible, segnalazione, inviando, onClose, onChange, onInvia }: Props) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalClose}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Segnala un problema</Text>
          <TouchableOpacity onPress={onInvia} disabled={inviando}>
            {inviando
              ? <ActivityIndicator color="#0E9F8E" size="small" />
              : <Text style={styles.modalSave}>Invia</Text>
            }
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>TIPO</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              {SEGNALAZIONE_TIPI.map(t => (
                <TouchableOpacity key={t.key}
                  style={[styles.unitaChip, segnalazione.tipo === t.key && styles.unitaChipActive, { paddingHorizontal: 14, paddingVertical: 10 }]}
                  onPress={() => onChange(s => ({ ...s, tipo: t.key }))}>
                  <Text style={[styles.unitaChipText, segnalazione.tipo === t.key && styles.unitaChipTextActive, { fontSize: 13 }]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>TITOLO *</Text>
            <TextInput style={styles.fieldInput} value={segnalazione.titolo}
              onChangeText={v => onChange(s => ({ ...s, titolo: v }))}
              placeholder="es. Il PDF non si genera" placeholderTextColor="#9CA3AF" autoFocus />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>DESCRIZIONE *</Text>
            <TextInput style={[styles.fieldInput, { height: 120, textAlignVertical: 'top' }]}
              value={segnalazione.descrizione}
              onChangeText={v => onChange(s => ({ ...s, descrizione: v }))}
              placeholder="Descrivi il problema nel dettaglio..." placeholderTextColor="#9CA3AF" multiline />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>SCHERMATA (opzionale)</Text>
            <TextInput style={styles.fieldInput} value={segnalazione.schermata}
              onChangeText={v => onChange(s => ({ ...s, schermata: v }))}
              placeholder="es. Builder, Chat, Storico..." placeholderTextColor="#9CA3AF" />
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxText}>
              Le segnalazioni vengono analizzate entro 24-48 ore. Grazie per aiutarci a migliorare PreventivoAI!
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  )
}
