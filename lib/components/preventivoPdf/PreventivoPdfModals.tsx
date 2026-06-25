import { router } from 'expo-router'
import { FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { ClientePreventivo, MetodoPagamento } from '../../api/preventivoPdf'

type PagamentoModalProps = {
  visible: boolean
  metodiPagamento: MetodoPagamento[]
  metodoSelezionato: MetodoPagamento | null
  stripeChargesEnabled?: boolean
  onClose: () => void
  onSelect: (metodo: MetodoPagamento | null) => void
}

export function PreventivoPdfPagamentoModal({
  visible,
  metodiPagamento,
  metodoSelezionato,
  stripeChargesEnabled = false,
  onClose,
  onSelect,
}: PagamentoModalProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Metodo di pagamento</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalClose}>x</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
          <TouchableOpacity
            style={[styles.clienteItem, !metodoSelezionato && styles.clienteItemActive]}
            onPress={() => { onSelect(null); onClose() }}
          >
            <Text style={{ fontSize: 13, color: '#6B7280' }}>NO</Text>
            <Text style={[styles.clienteItemNome, { flex: 1 }]}>Nessun metodo</Text>
            {!metodoSelezionato && <Text style={{ color: '#0E9F8E', fontSize: 13, fontWeight: '700' }}>OK</Text>}
          </TouchableOpacity>
          {metodiPagamento.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <Text style={{ fontSize: 14, color: '#9CA3AF' }}>Nessun metodo configurato</Text>
              <TouchableOpacity onPress={() => { onClose(); router.push('/screens/pagamenti') }} style={{ marginTop: 8 }}>
                <Text style={{ fontSize: 14, color: '#0E9F8E', fontWeight: '600' }}>Configura nelle impostazioni</Text>
              </TouchableOpacity>
            </View>
          ) : (
            metodiPagamento.map(m => {
              const stripeDisabilitato = m.tipo === 'stripe' && !stripeChargesEnabled
              return (
              <TouchableOpacity
                key={m.id}
                style={[
                  styles.clienteItem,
                  metodoSelezionato?.id === m.id && styles.clienteItemActive,
                  stripeDisabilitato && styles.clienteItemDisabled,
                ]}
                onPress={() => { if (!stripeDisabilitato) { onSelect(m); onClose() } }}
                disabled={stripeDisabilitato}
              >
                <Text style={{ fontSize: 12, color: '#6B7280', width: 44 }}>{m.tipo.toUpperCase().slice(0, 4)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.clienteItemNome}>{m.nome}</Text>
                  {m.tipo === 'bonifico' && m.dati?.iban && <Text style={{ fontSize: 12, color: '#9CA3AF' }}>{m.dati.iban}</Text>}
                  {m.tipo === 'paypal' && m.dati?.email && <Text style={{ fontSize: 12, color: '#9CA3AF' }}>{m.dati.email}</Text>}
                  {stripeDisabilitato && (
                    <Text style={styles.stripeDisabled}>Completa la verifica Stripe in Impostazioni</Text>
                  )}
                </View>
                {metodoSelezionato?.id === m.id && !stripeDisabilitato && <Text style={{ color: '#0E9F8E', fontSize: 13, fontWeight: '700' }}>OK</Text>}
              </TouchableOpacity>
              )
            })
          )}
        </ScrollView>
      </View>
    </Modal>
  )
}

type ClienteModalProps = {
  visible: boolean
  clienti: ClientePreventivo[]
  clienteSelezionato: ClientePreventivo | null
  modalTab: 'esistente' | 'nuovo'
  nuovoNomeCliente: string
  onClose: () => void
  onChangeTab: (tab: 'esistente' | 'nuovo') => void
  onChangeNuovoNome: (nome: string) => void
  onSelectCliente: (cliente: ClientePreventivo | null) => void
  onAggiungiCliente: () => void
}

export function PreventivoPdfClienteModal({
  visible,
  clienti,
  clienteSelezionato,
  modalTab,
  nuovoNomeCliente,
  onClose,
  onChangeTab,
  onChangeNuovoNome,
  onSelectCliente,
  onAggiungiCliente,
}: ClienteModalProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>A chi e questo preventivo?</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalClose}>x</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.modalTabs}>
          {(['esistente', 'nuovo'] as const).map(t => (
            <TouchableOpacity key={t} style={[styles.modalTab, modalTab === t && styles.modalTabActive]} onPress={() => onChangeTab(t)}>
              <Text style={[styles.modalTabText, modalTab === t && styles.modalTabTextActive]}>
                {t === 'esistente' ? 'Cliente esistente' : 'Nuovo cliente'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {modalTab === 'esistente' ? (
          <FlatList
            data={clienti}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: 16, gap: 8 }}
            ListEmptyComponent={
              <View style={styles.modalEmpty}>
                <Text style={styles.modalEmptyText}>Nessun cliente ancora</Text>
                <TouchableOpacity onPress={() => onChangeTab('nuovo')}>
                  <Text style={styles.modalEmptyLink}>Aggiungi il primo</Text>
                </TouchableOpacity>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.clienteItem, clienteSelezionato?.id === item.id && styles.clienteItemActive]}
                onPress={() => { onSelectCliente(item); onClose() }}
              >
                <View style={styles.clienteItemAvatar}>
                  <Text style={styles.clienteItemAvatarText}>{item.nome.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.clienteItemNome}>{item.nome}</Text>
                {clienteSelezionato?.id === item.id && <Text style={styles.clienteItemCheck}>OK</Text>}
              </TouchableOpacity>
            )}
          />
        ) : (
          <View style={styles.modalNewForm}>
            <Text style={styles.modalNewLabel}>NOME CLIENTE</Text>
            <TextInput
              style={styles.modalNewInput}
              value={nuovoNomeCliente}
              onChangeText={onChangeNuovoNome}
              placeholder="es. Mario Rossi"
              placeholderTextColor="#9CA3AF"
              autoFocus
            />
            <TouchableOpacity
              style={[styles.modalNewBtn, !nuovoNomeCliente.trim() && styles.generateBtnDisabled]}
              onPress={onAggiungiCliente}
              disabled={!nuovoNomeCliente.trim()}
            >
              <Text style={styles.modalNewBtnText}>Aggiungi e seleziona</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSkipBtn} onPress={() => { onSelectCliente(null); onClose() }}>
              <Text style={styles.modalSkipText}>Salta - senza cliente</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: '#F7F8FA' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56, backgroundColor: '#0D1B2A' },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalClose: { color: '#9CA3AF', fontSize: 20 },
  modalTabs: { flexDirection: 'row', backgroundColor: '#fff', margin: 16, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: '#E5E7EB' },
  modalTab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' as const },
  modalTabActive: { backgroundColor: '#0D1B2A' },
  modalTabText: { fontSize: 13, fontWeight: '500', color: '#9CA3AF' },
  modalTabTextActive: { color: '#fff' },
  modalEmpty: { alignItems: 'center', paddingTop: 40 },
  modalEmptyText: { fontSize: 14, color: '#9CA3AF' },
  modalEmptyLink: { fontSize: 14, color: '#0E9F8E', marginTop: 8, fontWeight: '600' },
  clienteItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  clienteItemActive: { borderColor: '#0E9F8E', backgroundColor: '#F0FDF4' },
  clienteItemDisabled: { opacity: 0.55 },
  stripeDisabled: { fontSize: 11, color: '#B45309', marginTop: 4, fontWeight: '600' },
  clienteItemAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#0D1B2A', justifyContent: 'center', alignItems: 'center' },
  clienteItemAvatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  clienteItemNome: { flex: 1, fontSize: 14, fontWeight: '500', color: '#0D1B2A' },
  clienteItemCheck: { fontSize: 16, color: '#0E9F8E', fontWeight: '700' },
  modalNewForm: { padding: 16, gap: 12 },
  modalNewLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.8 },
  modalNewInput: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 12, fontSize: 14, color: '#0D1B2A' },
  modalNewBtn: { backgroundColor: '#0D1B2A', borderRadius: 12, padding: 14, alignItems: 'center' as const },
  modalNewBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  generateBtnDisabled: { opacity: 0.5 },
  modalSkipBtn: { padding: 12, alignItems: 'center' as const },
  modalSkipText: { fontSize: 13, color: '#9CA3AF' },
})
