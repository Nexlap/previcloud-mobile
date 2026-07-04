import { Dispatch, SetStateAction } from 'react'
import { ActivityIndicator, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { Cliente } from '../../types'
import { AppIcon } from '../icons/AppIcon'

type ModalTab = 'esistente' | 'nuovo'

type NuovoCliente = {
  nome: string
  telefono: string
  email: string
  indirizzo: string
}

type Props = {
  visible: boolean
  clienti: Cliente[]
  clienteSelezionato: Cliente | null
  modalTab: ModalTab
  setModalTab: (tab: ModalTab) => void
  ricercaCliente: string
  setRicercaCliente: (value: string) => void
  nuovoCliente: NuovoCliente
  setNuovoCliente: Dispatch<SetStateAction<NuovoCliente>>
  salvandoCliente: boolean
  onClose: () => void
  onSelectCliente: (cliente: Cliente) => void
  onSalvaCliente: () => void
}

export function ClienteModal({
  visible,
  clienti,
  clienteSelezionato,
  modalTab,
  setModalTab,
  ricercaCliente,
  setRicercaCliente,
  nuovoCliente,
  setNuovoCliente,
  salvandoCliente,
  onClose,
  onSelectCliente,
  onSalvaCliente,
}: Props) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Cliente</Text>
          <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Chiudi" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <AppIcon name="x" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
        <View style={styles.modalTabs}>
          {(['esistente', 'nuovo'] as const).map(tab => (
            <TouchableOpacity key={tab} style={[styles.modalTab, modalTab === tab && styles.modalTabActive]}
              onPress={() => setModalTab(tab)}>
              <Text style={[styles.modalTabText, modalTab === tab && styles.modalTabTextActive]}>
                {tab === 'esistente' ? 'Cliente esistente' : 'Nuovo cliente'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {modalTab === 'esistente' ? (
          <View style={{ flex: 1 }}>
            <View style={{ padding: 16, paddingBottom: 8 }}>
              <TextInput
                style={styles.input}
                value={ricercaCliente}
                onChangeText={setRicercaCliente}
                placeholder="Cerca cliente..."
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <FlatList
              data={clienti.filter(c => c.nome.toLowerCase().includes(ricercaCliente.toLowerCase()))}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 16, paddingTop: 8, gap: 8 }}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingTop: 40 }}>
                  <Text style={{ fontSize: 14, color: '#9CA3AF' }}>Nessun cliente trovato</Text>
                  <TouchableOpacity onPress={() => setModalTab('nuovo')} style={{ marginTop: 8 }}>
                    <Text style={{ fontSize: 14, color: '#0B7A6D', fontWeight: '600' }}>Aggiungi nuovo →</Text>
                  </TouchableOpacity>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.clienteItem, clienteSelezionato?.id === item.id && styles.clienteItemActive]}
                  onPress={() => onSelectCliente(item)}
                >
                  <View style={styles.clienteItemAvatar}>
                    <Text style={styles.clienteItemAvatarText}>{item.nome.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.clienteItemNome}>{item.nome}</Text>
                    {item.email ? <Text style={{ fontSize: 12, color: '#9CA3AF' }}>{item.email}</Text> : null}
                  </View>
                  {clienteSelezionato?.id === item.id && <AppIcon name="check" size={16} color="#0B7A6D" />}
                </TouchableOpacity>
              )}
            />
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
            <Text style={styles.modalFieldLabel}>NOME *</Text>
            <TextInput style={styles.modalFieldInput} value={nuovoCliente.nome}
              onChangeText={v => setNuovoCliente(c => ({...c, nome: v}))}
              placeholder="es. Mario Rossi" placeholderTextColor="#9CA3AF" autoFocus />
            <Text style={styles.modalFieldLabel}>TELEFONO</Text>
            <TextInput style={styles.modalFieldInput} value={nuovoCliente.telefono}
              onChangeText={v => setNuovoCliente(c => ({...c, telefono: v}))}
              placeholder="es. 339 1234567" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" />
            <Text style={styles.modalFieldLabel}>EMAIL</Text>
            <TextInput style={styles.modalFieldInput} value={nuovoCliente.email}
              onChangeText={v => setNuovoCliente(c => ({...c, email: v}))}
              placeholder="es. mario@gmail.com" placeholderTextColor="#9CA3AF" keyboardType="email-address" autoCapitalize="none" />
            <Text style={styles.modalFieldLabel}>INDIRIZZO</Text>
            <TextInput style={styles.modalFieldInput} value={nuovoCliente.indirizzo}
              onChangeText={v => setNuovoCliente(c => ({...c, indirizzo: v}))}
              placeholder="es. Via Roma 1, Milano" placeholderTextColor="#9CA3AF" />
            <TouchableOpacity
              style={[styles.generateBtn, (!nuovoCliente.nome.trim() || salvandoCliente) && styles.generateBtnDisabled]}
              onPress={onSalvaCliente}
              disabled={!nuovoCliente.nome.trim() || salvandoCliente}
            >
              {salvandoCliente
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.generateBtnText}>Salva e seleziona</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity style={{ alignItems: 'center', padding: 8 }} onPress={onClose}>
              <Text style={{ fontSize: 13, color: '#9CA3AF' }}>Continua senza cliente</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  input: { backgroundColor: '#F7F8FA', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 12, fontSize: 14, color: '#0D1B2A' },
  generateBtn: { backgroundColor: '#0D1B2A', borderRadius: 16, padding: 16, alignItems: 'center' as const },
  generateBtnDisabled: { opacity: 0.4 },
  generateBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalContainer: { flex: 1, backgroundColor: '#F7F8FA' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56, backgroundColor: '#0D1B2A' },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalClose: { color: '#9CA3AF', fontSize: 20 },
  modalTabs: { flexDirection: 'row', backgroundColor: '#fff', margin: 16, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: '#E5E7EB' },
  modalTab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' as const },
  modalTabActive: { backgroundColor: '#0D1B2A' },
  modalTabText: { fontSize: 13, fontWeight: '500', color: '#9CA3AF' },
  modalTabTextActive: { color: '#fff' },
  modalFieldLabel: { fontSize: 11, fontWeight: '600' as const, color: '#9CA3AF', letterSpacing: 0.8 },
  modalFieldInput: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 12, fontSize: 14, color: '#0D1B2A' },
  clienteItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  clienteItemActive: { borderColor: '#0E9F8E', backgroundColor: '#F0FDF4' },
  clienteItemAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#0D1B2A', justifyContent: 'center', alignItems: 'center' },
  clienteItemAvatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  clienteItemNome: { fontSize: 14, fontWeight: '500', color: '#0D1B2A' },
})
