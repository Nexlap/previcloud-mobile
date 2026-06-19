import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AppIcon } from '../icons/AppIcon'
import { IconLabel } from '../icons/IconLabel'
import { metodoPagamentoFeatherIcon } from '../../utils/metodoPagamentoIcon'

type MetodoPagamento = {
  id: string
  nome: string
  tipo?: string
}

type Props = {
  metodiPagamento: MetodoPagamento[]
  metodoPagamentoSelezionato: MetodoPagamento | null
  onOpen: () => void
  onConfigura: () => void
}

export function PagamentoCard({ metodiPagamento, metodoPagamentoSelezionato, onOpen, onConfigura }: Props) {
  const iconName = metodoPagamentoFeatherIcon(metodoPagamentoSelezionato?.tipo)

  return (
    <View style={styles.card}>
      <IconLabel icon="credit-card" label="Pagamento" textStyle={styles.cardTitle} />
      <Text style={styles.cardSub}>Come vuoi essere pagato</Text>
      <TouchableOpacity style={styles.dropdownBtn} onPress={onOpen}>
        <View style={styles.dropdownLeft}>
          <AppIcon name={iconName} size={18} color="#6B7280" />
          <Text style={styles.dropdownText}>{metodoPagamentoSelezionato ? metodoPagamentoSelezionato.nome : 'Scegli metodo di pagamento'}</Text>
        </View>
        <AppIcon name="chevron-down" size={18} color="#9CA3AF" />
      </TouchableOpacity>
      {metodiPagamento.length <= 1 && (
        <TouchableOpacity onPress={onConfigura}>
          <Text style={{ fontSize: 13, color: '#0E9F8E', textAlign: 'center', paddingTop: 10 }}>Configura altri metodi di pagamento →</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#0D1B2A' },
  cardSub: { fontSize: 12, color: '#9CA3AF', marginTop: -6 },
  dropdownBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F7F8FA', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 12 },
  dropdownLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  dropdownText: { fontSize: 14, color: '#0D1B2A', fontWeight: '500', flex: 1 },
})
