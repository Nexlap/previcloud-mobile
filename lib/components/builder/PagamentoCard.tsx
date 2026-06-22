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
  metodoPagamentoNessuno: boolean
  onOpen: () => void
  onConfigura: () => void
}

export function PagamentoCard({
  metodiPagamento,
  metodoPagamentoSelezionato,
  metodoPagamentoNessuno,
  onOpen,
  onConfigura,
}: Props) {
  const etichetta = metodoPagamentoNessuno
    ? 'Nessuno / da concordare'
    : metodoPagamentoSelezionato
      ? metodoPagamentoSelezionato.nome
      : 'Scegli metodo di pagamento'

  const iconName = metodoPagamentoNessuno
    ? 'minus'
    : metodoPagamentoFeatherIcon(metodoPagamentoSelezionato?.tipo)

  return (
    <View style={styles.card}>
      <IconLabel icon="credit-card" label="Pagamento" textStyle={styles.cardTitle} />
      <Text style={styles.cardSub}>Come vuoi essere pagato</Text>
      <TouchableOpacity style={styles.dropdownBtn} onPress={onOpen}>
        <View style={styles.dropdownLeft}>
          {metodoPagamentoNessuno ? (
            <Text style={styles.nessunoIcon}>—</Text>
          ) : (
            <AppIcon name={iconName} size={18} color="#6B7280" />
          )}
          <Text
            style={[
              styles.dropdownText,
              metodoPagamentoNessuno && styles.dropdownTextNessuno,
              !metodoPagamentoNessuno && !metodoPagamentoSelezionato && styles.dropdownTextPlaceholder,
            ]}
          >
            {etichetta}
          </Text>
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
  nessunoIcon: { fontSize: 16, color: '#9CA3AF', width: 18, textAlign: 'center' },
  dropdownText: { fontSize: 14, color: '#0D1B2A', fontWeight: '500', flex: 1 },
  dropdownTextNessuno: { color: '#6B7280' },
  dropdownTextPlaceholder: { color: '#9CA3AF' },
})
