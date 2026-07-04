import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Text, TouchableOpacity, View } from 'react-native'
import { MetodoPagamento } from '../../api/preventivoPdf'
import { iconaMetodoPagamento } from '../../features/nuovo/chat'
import { AppIcon } from '../icons/AppIcon'
import { nuovoStyles as styles } from './nuovoStyles'

type Props = {
  metodoPagamento: MetodoPagamento | null
  onPress: () => void
}

export function NuovoPagamentoCard({ metodoPagamento, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.paymentCard} onPress={onPress} accessibilityRole="button" accessibilityLabel="Seleziona metodo di pagamento">
      <MaterialCommunityIcons
        name={iconaMetodoPagamento(metodoPagamento?.tipo) as keyof typeof MaterialCommunityIcons.glyphMap}
        size={22}
        color="#0D1B2A"
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.paymentLabel}>Pagamento</Text>
        <Text style={styles.paymentValue}>{metodoPagamento ? metodoPagamento.nome : 'Nessun metodo selezionato'}</Text>
      </View>
      <AppIcon name="chevron-right" size={18} color="#9CA3AF" />
    </TouchableOpacity>
  )
}
