import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { MetodoPagamento } from '../../api/preventivoPdf'
import { NuovoPagamentoCard } from './NuovoPagamentoCard'
import { nuovoStyles as styles } from './nuovoStyles'

type Props = {
  recap: string
  loading: boolean
  metodoPagamento: MetodoPagamento | null
  onApriPagamento: () => void
  onGeneraPreventivo: () => void
  onModifica: () => void
}

export function NuovoRecapView({
  recap,
  loading,
  metodoPagamento,
  onApriPagamento,
  onGeneraPreventivo,
  onModifica,
}: Props) {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.recapCard}>
        <View style={styles.recapHeader}>
          <Text style={styles.recapHeaderTitle}>📋 Riepilogo lavoro</Text>
          <Text style={styles.recapHeaderSub}>Conferma o modifica prima di generare</Text>
        </View>
        <Text style={styles.recapText}>{recap}</Text>
        <NuovoPagamentoCard metodoPagamento={metodoPagamento} onPress={onApriPagamento} />
        <View style={styles.recapActions}>
          <TouchableOpacity style={styles.recapConfirmBtn} onPress={onGeneraPreventivo}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.recapConfirmText}>✓ Genera preventivo</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={styles.recapEditBtn} onPress={onModifica}>
            <Text style={styles.recapEditText}>✏️ Modifica</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  )
}
