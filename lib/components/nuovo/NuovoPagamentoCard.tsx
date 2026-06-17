import { Text, TouchableOpacity, View } from 'react-native'
import { MetodoPagamento } from '../../api/preventivoPdf'
import { iconaMetodoPagamento } from '../../features/nuovo/chat'
import { nuovoStyles as styles } from './nuovoStyles'

type Props = {
  metodoPagamento: MetodoPagamento | null
  onPress: () => void
}

export function NuovoPagamentoCard({ metodoPagamento, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.paymentCard} onPress={onPress}>
      <Text style={styles.paymentIcon}>{metodoPagamento ? iconaMetodoPagamento(metodoPagamento.tipo) : '💳'}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.paymentLabel}>Pagamento</Text>
        <Text style={styles.paymentValue}>{metodoPagamento ? metodoPagamento.nome : 'Nessun metodo selezionato'}</Text>
      </View>
      <Text style={styles.paymentArrow}>›</Text>
    </TouchableOpacity>
  )
}
