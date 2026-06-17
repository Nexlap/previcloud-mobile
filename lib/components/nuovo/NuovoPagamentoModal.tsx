import { router } from 'expo-router'
import { Text, TouchableOpacity, View } from 'react-native'
import { MetodoPagamento } from '../../api/preventivoPdf'
import { iconaMetodoPagamento } from '../../features/nuovo/chat'
import { nuovoStyles as styles } from './nuovoStyles'

type Props = {
  visible: boolean
  metodiPagamento: MetodoPagamento[]
  metodoPagamentoSelezionato: MetodoPagamento | null
  onClose: () => void
  onSelect: (metodo: MetodoPagamento | null) => void
}

export function NuovoPagamentoModal({
  visible,
  metodiPagamento,
  metodoPagamentoSelezionato,
  onClose,
  onSelect,
}: Props) {
  if (!visible) return null

  return (
    <View style={styles.clienteModalOverlay}>
      <View style={styles.clienteModalBox}>
        <Text style={styles.clienteModalTitolo}>Metodo di pagamento</Text>
        <TouchableOpacity
          style={[styles.paymentOption, !metodoPagamentoSelezionato && styles.paymentOptionActive]}
          onPress={() => { onSelect(null); onClose() }}
        >
          <Text style={styles.paymentIcon}>🚫</Text>
          <Text style={styles.paymentOptionText}>Nessun metodo</Text>
          {!metodoPagamentoSelezionato && <Text style={styles.paymentCheck}>✓</Text>}
        </TouchableOpacity>
        {metodiPagamento.length === 0 ? (
          <TouchableOpacity style={styles.clienteModalBtn} onPress={() => { onClose(); router.push('/screens/pagamenti') }}>
            <Text style={styles.clienteModalBtnText}>Configura nelle impostazioni</Text>
          </TouchableOpacity>
        ) : (
          metodiPagamento.map(m => (
            <TouchableOpacity
              key={m.id}
              style={[styles.paymentOption, metodoPagamentoSelezionato?.id === m.id && styles.paymentOptionActive]}
              onPress={() => { onSelect(m); onClose() }}
            >
              <Text style={styles.paymentIcon}>{iconaMetodoPagamento(m.tipo)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.paymentOptionText}>{m.nome}</Text>
                {m.tipo === 'bonifico' && m.dati?.iban && <Text style={styles.paymentOptionSub}>{m.dati.iban}</Text>}
                {m.tipo === 'paypal' && m.dati?.email && <Text style={styles.paymentOptionSub}>{m.dati.email}</Text>}
              </View>
              {metodoPagamentoSelezionato?.id === m.id && <Text style={styles.paymentCheck}>✓</Text>}
            </TouchableOpacity>
          ))
        )}
        <TouchableOpacity style={styles.clienteModalSkip} onPress={onClose}>
          <Text style={styles.clienteModalSkipText}>Chiudi</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
