import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Cliente } from '../../types'

type Props = {
  clienteSelezionato: Cliente | null
  onOpenCliente: () => void
  onClearCliente: () => void
}

export function ClienteCard({ clienteSelezionato, onOpenCliente, onClearCliente }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>👤 Cliente</Text>
      <Text style={styles.cardSub}>Opzionale — i dati appariranno nel PDF</Text>
      {clienteSelezionato ? (
        <View style={styles.clienteSelezionatoBox}>
          <View style={{ flex: 1 }}>
            <Text style={styles.clienteSelezionatoNome}>{clienteSelezionato.nome}</Text>
            {clienteSelezionato.email ? <Text style={styles.clienteSelezionatoInfo}>{clienteSelezionato.email}</Text> : null}
            {clienteSelezionato.telefono ? <Text style={styles.clienteSelezionatoInfo}>{clienteSelezionato.telefono}</Text> : null}
          </View>
          <TouchableOpacity onPress={onClearCliente}>
            <Text style={{ fontSize: 18, color: '#9CA3AF' }}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.clienteAggiungiBtn} onPress={onOpenCliente}>
          <Text style={styles.clienteAggiungiIcon}>+</Text>
          <Text style={styles.clienteAggiungiText}>Seleziona o aggiungi cliente</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#0D1B2A' },
  cardSub: { fontSize: 12, color: '#9CA3AF', marginTop: -6 },
  clienteSelezionatoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#0E9F8E' },
  clienteSelezionatoNome: { fontSize: 14, fontWeight: '600', color: '#0D1B2A' },
  clienteSelezionatoInfo: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  clienteAggiungiBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F7F8FA', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed' as const },
  clienteAggiungiIcon: { fontSize: 20, color: '#0E9F8E', fontWeight: '600' },
  clienteAggiungiText: { fontSize: 14, color: '#6B7280' },
})
