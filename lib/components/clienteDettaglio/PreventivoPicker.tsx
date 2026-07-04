import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Preventivo } from '../../types'
import { formatImportoEuro } from 'previcloud-shared'

type Props = {
  preventivi: Preventivo[]
  selezionatoId: string | null
  onSelect: (id: string | null) => void
}

export function PreventivoPicker({ preventivi, selezionatoId, onSelect }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>PREVENTIVO COLLEGATO (opzionale)</Text>
      <View style={styles.list}>
        <TouchableOpacity
          style={[styles.row, selezionatoId === null && styles.rowSelected]}
          onPress={() => onSelect(null)}
        >
          <Text style={[styles.rowTitle, selezionatoId === null && styles.rowTitleSelected]}>
            Nessun preventivo
          </Text>
        </TouchableOpacity>
        {preventivi.map(p => {
          const titolo = p.titolo?.trim() || 'Preventivo senza titolo'
          const importo = p.importo_totale != null ? `\u20AC${formatImportoEuro(p.importo_totale, 2)}` : ''
          return (
            <TouchableOpacity
              key={p.id}
              style={[styles.row, selezionatoId === p.id && styles.rowSelected]}
              onPress={() => onSelect(p.id)}
            >
              <Text style={[styles.rowTitle, selezionatoId === p.id && styles.rowTitleSelected]} numberOfLines={1}>
                {titolo}
              </Text>
              {importo ? <Text style={styles.rowSub}>{importo}</Text> : null}
            </TouchableOpacity>
          )
        })}
        {preventivi.length === 0 ? (
          <Text style={styles.emptyHint}>Nessun preventivo disponibile per questo cliente</Text>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.8 },
  list: { borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#F7F8FA', overflow: 'hidden' },
  row: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  rowSelected: { backgroundColor: '#F0FDF4' },
  rowTitle: { fontSize: 14, fontWeight: '500', color: '#374151' },
  rowTitleSelected: { color: '#0B7A6D', fontWeight: '600' },
  rowSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  emptyHint: { padding: 12, fontSize: 12, color: '#9CA3AF', textAlign: 'center' },
})
