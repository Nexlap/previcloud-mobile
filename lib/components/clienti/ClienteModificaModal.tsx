import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { COLORS } from '../../constants'
import type { Cliente } from '../../types'

export type ClienteModificaForm = {
  nome: string
  telefono: string
  email: string
  note: string
}

type Props = {
  visible: boolean
  dati: ClienteModificaForm
  salvando: boolean
  onClose: () => void
  onChange: (updater: (prev: ClienteModificaForm) => ClienteModificaForm) => void
  onSalva: () => void
}

export function ClienteModificaModal({ visible, dati, salvando, onClose, onChange, onSalva }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.box} onPress={e => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Modifica cliente</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Text style={styles.close}>{'\u2715'}</Text>
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
              onChangeText={nome => onChange(prev => ({ ...prev, nome }))}
              placeholder="Nome cliente"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.fieldLabel}>TELEFONO</Text>
            <TextInput
              style={styles.fieldInput}
              value={dati.telefono}
              onChangeText={telefono => onChange(prev => ({ ...prev, telefono }))}
              placeholder="Telefono"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />

            <Text style={styles.fieldLabel}>EMAIL</Text>
            <TextInput
              style={styles.fieldInput}
              value={dati.email}
              onChangeText={email => onChange(prev => ({ ...prev, email }))}
              placeholder="Email"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.fieldLabel}>NOTE</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldTextarea]}
              value={dati.note}
              onChangeText={note => onChange(prev => ({ ...prev, note }))}
              placeholder="Note"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
            />
          </ScrollView>

          <TouchableOpacity style={styles.saveBtn} onPress={onSalva} disabled={salvando}>
            {salvando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Salva</Text>
            )}
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

export function clienteToModificaForm(c: Cliente): ClienteModificaForm {
  return {
    nome: c.nome,
    telefono: c.telefono || '',
    email: c.email || '',
    note: c.note || '',
  }
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  box: {
    backgroundColor: '#fff',
    borderRadius: 16,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  close: {
    fontSize: 18,
    color: '#9CA3AF',
  },
  scroll: {
    maxHeight: 360,
  },
  scrollContent: {
    padding: 20,
    gap: 8,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.5,
    marginTop: 8,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  fieldTextarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveBtn: {
    backgroundColor: COLORS.accent,
    margin: 16,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
})
