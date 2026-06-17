import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

type MetodoPagamento = {
  id: string
  tipo?: string
  nome: string
  dati?: {
    iban?: string
    email?: string
  }
}

type Props = {
  visible: boolean
  metodiPagamento: MetodoPagamento[]
  metodoPagamentoSelezionato: MetodoPagamento | null
  onClose: () => void
  onSelect: (metodo: MetodoPagamento) => void
}

export function MetodoPagamentoModal({ visible, metodiPagamento, metodoPagamentoSelezionato, onClose, onSelect }: Props) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
          <Text style={styles.modalTitle}>Metodo pagamento</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
          {metodiPagamento.map(m => (
            <TouchableOpacity key={m.id} style={[styles.clienteItem, metodoPagamentoSelezionato?.id === m.id && styles.clienteItemActive]} onPress={() => onSelect(m)}>
              <Text style={{ fontSize: 20 }}>{m.tipo === 'bonifico' ? '🏦' : m.tipo === 'paypal' ? '💙' : m.tipo === 'contanti' ? '💵' : m.tipo === 'stripe' ? '🔗' : '💳'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.clienteSelezionatoNome}>{m.nome}</Text>
                {m.tipo === 'bonifico' && m.dati?.iban && <Text style={styles.clienteSelezionatoInfo}>{m.dati.iban}</Text>}
                {m.tipo === 'paypal' && m.dati?.email && <Text style={styles.clienteSelezionatoInfo}>{m.dati.email}</Text>}
              </View>
              {metodoPagamentoSelezionato?.id === m.id && <Text style={{ color: '#0E9F8E', fontSize: 16, fontWeight: '700' }}>✓</Text>}
            </TouchableOpacity>
          ))}
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
  clienteItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  clienteItemActive: { borderColor: '#0E9F8E', backgroundColor: '#F0FDF4' },
  clienteSelezionatoNome: { fontSize: 14, fontWeight: '600', color: '#0D1B2A' },
  clienteSelezionatoInfo: { fontSize: 12, color: '#6B7280', marginTop: 2 },
})
