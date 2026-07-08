import { ActivityIndicator, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { UNITA_OPTIONS } from '../../features/listino/constants'
import { useScreenTheme } from '../../hooks/useScreenTheme'
import { formatImportoEuroVisuale, parseImportoEuro } from 'previcloud-shared'
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
  const { colors, isDark } = useScreenTheme()
  const inputBg = isDark ? colors.bg : '#F7F8FA'
  const ph = colors.textMuted

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalContainer, { backgroundColor: colors.bg }]}>
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
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>NOME SERVIZIO *</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={draft.nome}
              onChangeText={v => onChange(s => ({ ...s, nome: v }))}
              placeholder="es. Editing video"
              placeholderTextColor={ph}
              autoFocus
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>DESCRIZIONE</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, height: 80, textAlignVertical: 'top' }]}
              value={draft.descrizione}
              onChangeText={v => onChange(s => ({ ...s, descrizione: v }))}
              placeholder="es. Montaggio con musica e sottotitoli"
              placeholderTextColor={ph}
              multiline
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>COSTO ({'\u20AC'})</Text>
              <TextInput
                style={[styles.fieldInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={draft.costo}
                onChangeText={v => onChange(s => ({ ...s, costo: v }))}
                placeholder="es. 500"
                placeholderTextColor={ph}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>UNITÀ</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {UNITA_OPTIONS.map(u => {
                  const active = draft.unita === u
                  return (
                    <TouchableOpacity
                      key={u}
                      style={[
                        styles.unitaChip,
                        {
                          backgroundColor: active ? '#0D1B2A' : inputBg,
                          borderColor: active ? '#0D1B2A' : colors.border,
                        },
                      ]}
                      onPress={() => onChange(s => ({ ...s, unita: u }))}
                    >
                      <Text style={[styles.unitaChipText, active ? styles.unitaChipTextActive : { color: colors.textMuted }]}>
                        {u}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>
          </View>
          {draft.nome ? (
            <View style={[styles.previewBox, isDark && { backgroundColor: 'rgba(14,159,142,0.1)' }]}>
              <Text style={styles.previewLabel}>ANTEPRIMA</Text>
              <Text style={[styles.previewNome, { color: colors.text }]}>{draft.nome}</Text>
              {draft.descrizione ? <Text style={[styles.previewDesc, { color: colors.textMuted }]}>{draft.descrizione}</Text> : null}
              {draft.costo ? <Text style={styles.previewCosto}>{`\u20AC${formatImportoEuroVisuale(parseImportoEuro(draft.costo) ?? 0)} / ${draft.unita}`}</Text> : null}
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  )
}
