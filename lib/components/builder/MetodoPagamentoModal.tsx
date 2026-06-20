import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AppIcon } from '../icons/AppIcon'
import { metodoPagamentoFeatherIcon } from '../../utils/metodoPagamentoIcon'

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
  stripeChargesEnabled?: boolean
  onClose: () => void
  onSelect: (metodo: MetodoPagamento) => void
}

export function MetodoPagamentoModal({ visible, metodiPagamento, metodoPagamentoSelezionato, stripeChargesEnabled = false, onClose, onSelect }: Props) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <AppIcon name="x" size={22} color="#9CA3AF" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Metodo pagamento</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
          {metodiPagamento.map(m => {
            const stripeDisabilitato = m.tipo === 'stripe' && !stripeChargesEnabled
            return (
            <TouchableOpacity
              key={m.id}
              style={[
                styles.clienteItem,
                metodoPagamentoSelezionato?.id === m.id && styles.clienteItemActive,
                stripeDisabilitato && styles.clienteItemDisabled,
              ]}
              onPress={() => { if (!stripeDisabilitato) onSelect(m) }}
              disabled={stripeDisabilitato}
            >
              <AppIcon name={metodoPagamentoFeatherIcon(m.tipo)} size={20} color="#6B7280" />
              <View style={{ flex: 1 }}>
                <Text style={styles.clienteSelezionatoNome}>{m.nome}</Text>
                {m.tipo === 'bonifico' && m.dati?.iban && <Text style={styles.clienteSelezionatoInfo}>{m.dati.iban}</Text>}
                {m.tipo === 'paypal' && m.dati?.email && <Text style={styles.clienteSelezionatoInfo}>{m.dati.email}</Text>}
                {stripeDisabilitato && (
                  <Text style={styles.stripeDisabled}>Completa la verifica Stripe in Impostazioni</Text>
                )}
              </View>
              {metodoPagamentoSelezionato?.id === m.id && !stripeDisabilitato && <AppIcon name="check" size={18} color="#0E9F8E" />}
            </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: '#F7F8FA' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56, backgroundColor: '#0D1B2A' },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  clienteItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  clienteItemActive: { borderColor: '#0E9F8E', backgroundColor: '#F0FDF4' },
  clienteItemDisabled: { opacity: 0.55 },
  stripeDisabled: { fontSize: 11, color: '#B45309', marginTop: 4, fontWeight: '600' },
  clienteSelezionatoNome: { fontSize: 14, fontWeight: '600', color: '#0D1B2A' },
  clienteSelezionatoInfo: { fontSize: 12, color: '#6B7280', marginTop: 2 },
})
