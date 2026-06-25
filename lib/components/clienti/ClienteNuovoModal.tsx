import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { COLORS } from '../../constants'

export type NuovoClienteForm = {
  nome: string
  telefono: string
  email: string
  indirizzo: string
  note: string
}

type Props = {
  visible: boolean
  dati: NuovoClienteForm
  salvando: boolean
  onClose: () => void
  onChange: (updater: (prev: NuovoClienteForm) => NuovoClienteForm) => void
  onSalva: () => void
}

export function ClienteNuovoModal({ visible, dati, salvando, onClose, onChange, onSalva }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.box} onPress={e => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Nuovo cliente</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.fieldLabel}>NOME *</Text>
            <TextInput
              style={styles.fieldInput}
              value={dati.nome}
              onChangeText={v => onChange(c => ({ ...c, nome: v }))}
              placeholder="Nome e cognome"
              placeholderTextColor={COLORS.textMuted}
              autoFocus
            />
            <Text style={styles.fieldLabel}>TELEFONO</Text>
            <TextInput
              style={styles.fieldInput}
              value={dati.telefono}
              onChangeText={v => onChange(c => ({ ...c, telefono: v }))}
              placeholder="Telefono"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
            />
            <Text style={styles.fieldLabel}>EMAIL</Text>
            <TextInput
              style={styles.fieldInput}
              value={dati.email}
              onChangeText={v => onChange(c => ({ ...c, email: v }))}
              placeholder="Email"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.fieldLabel}>INDIRIZZO</Text>
            <TextInput
              style={styles.fieldInput}
              value={dati.indirizzo}
              onChangeText={v => onChange(c => ({ ...c, indirizzo: v }))}
              placeholder="Indirizzo"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="default"
              autoCapitalize="words"
            />
            <Text style={styles.fieldLabel}>NOTE</Text>
            <TextInput
              style={[styles.fieldInput, styles.noteInput]}
              value={dati.note}
              onChangeText={v => onChange(c => ({ ...c, note: v }))}
              placeholder="Note..."
              placeholderTextColor={COLORS.textMuted}
              multiline
            />
          </ScrollView>

          <TouchableOpacity
            style={[styles.saveBtn, salvando && styles.saveBtnDisabled]}
            onPress={onSalva}
            disabled={salvando}
          >
            {salvando
              ? <ActivityIndicator color={COLORS.white} size="small" />
              : <Text style={styles.saveBtnText}>Salva cliente</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Annulla</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  box: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    textAlign: 'center',
    marginLeft: 24,
  },
  close: {
    fontSize: 18,
    color: COLORS.textMuted,
    width: 24,
    textAlign: 'right',
  },
  scroll: { maxHeight: 340 },
  scrollContent: { gap: 6, paddingBottom: 4 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginTop: 4,
  },
  fieldInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: 12,
    fontSize: 14,
    color: COLORS.primary,
    marginBottom: 4,
  },
  noteInput: { height: 72, textAlignVertical: 'top' },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center' as const,
    marginTop: 12,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  cancelBtn: { paddingTop: 14, alignItems: 'center' as const },
  cancelText: { fontSize: 14, color: COLORS.textMuted },
})
