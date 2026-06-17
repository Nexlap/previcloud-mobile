import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Trascrizione } from '../../types'

type Props = {
  trascrizioni: Trascrizione[]
  aperto: string | null
  onToggle: (id: string) => void
  onGeneraPreventivo: (testo: string) => void
  formatDurata: (seconds: number | null) => string
}

export function ClienteTrascrizioniList({
  trascrizioni,
  aperto,
  onToggle,
  onGeneraPreventivo,
  formatDurata,
}: Props) {
  if (trascrizioni.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Nessuna chiamata registrata</Text>
      </View>
    )
  }

  return (
    <>
      {trascrizioni.map(t => (
        <TouchableOpacity key={t.id} style={styles.chiamataCard} onPress={() => onToggle(t.id)}>
          <View style={styles.chiamataRow}>
            <View>
              <Text style={styles.chiamataTitolo}>{t.titolo || 'Chiamata'}</Text>
              <Text style={styles.chiamataData}>{`${new Date(t.created_at).toLocaleDateString('it-IT')} · ${formatDurata(t.durata_secondi)}`}</Text>
            </View>
            <Text style={styles.chiamataArrow}>{aperto === t.id ? '▲' : '▼'}</Text>
          </View>
          {aperto === t.id && t.testo && (
            <View style={styles.chiamataDetail}>
              <Text style={styles.chiamataTesto}>{t.testo}</Text>
              <TouchableOpacity style={styles.editBtn} onPress={() => onGeneraPreventivo(t.testo || '')}>
                <Text style={styles.editBtnText}>{'\uD83D\uDCAC'} Genera preventivo da questa chiamata</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </>
  )
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 14, color: '#9CA3AF', marginBottom: 12 },
  chiamataCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  chiamataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  chiamataTitolo: { fontSize: 14, fontWeight: '500', color: '#0D1B2A' },
  chiamataData: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  chiamataArrow: { fontSize: 12, color: '#9CA3AF' },
  chiamataDetail: { padding: 14, borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 10 },
  chiamataTesto: { fontSize: 12, color: '#6B7280', lineHeight: 18 },
  editBtn: { backgroundColor: '#0D1B2A', borderRadius: 10, padding: 10, alignItems: 'center' },
  editBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
})
