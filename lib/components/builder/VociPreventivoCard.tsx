import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { VocePreventivo } from '../../types'

type Props = {
  voci: VocePreventivo[]
  includiIva: boolean
  totale: number
  totaleConIva: number
  onToggleIva: () => void
  onRimuoviVoce: (id: string) => void
  onAggiornaVoce: (id: string, campo: 'costo' | 'quantita' | 'descrizione', valore: string) => void
}

export function VociPreventivoCard({ voci, includiIva, totale, totaleConIva, onToggleIva, onRimuoviVoce, onAggiornaVoce }: Props) {
  if (voci.length === 0) return null

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Preventivo</Text>
      <Text style={styles.cardSub}>Modifica quantità e costo al volo</Text>
      {voci.map(v => (
        <View key={v.servizio_id} style={styles.voceRow}>
          <View style={styles.voceHeader}>
            <Text style={styles.voceNome}>{v.nome}</Text>
            <TouchableOpacity onPress={() => onRimuoviVoce(v.servizio_id)}>
              <Text style={styles.voceRemove}>✕</Text>
            </TouchableOpacity>
          </View>
          <TextInput style={styles.voceDesc} value={v.descrizione}
            onChangeText={val => onAggiornaVoce(v.servizio_id, 'descrizione', val)}
            placeholder="Descrizione (opzionale)" placeholderTextColor="#9CA3AF" />
          <View style={styles.voceCostoRow}>
            <View style={styles.voceCostoBox}>
              <Text style={styles.voceCostoLabel}>QTÀ</Text>
              <TextInput style={styles.voceCostoInput} value={v.quantita}
                onChangeText={val => onAggiornaVoce(v.servizio_id, 'quantita', val)} keyboardType="decimal-pad" />
            </View>
            <Text style={styles.voceMoltiply}>×</Text>
            <View style={styles.voceCostoBox}>
              <Text style={styles.voceCostoLabel}>€ / {v.unita}</Text>
              <TextInput style={styles.voceCostoInput} value={v.costo}
                onChangeText={val => onAggiornaVoce(v.servizio_id, 'costo', val)} keyboardType="decimal-pad" />
            </View>
            <Text style={styles.voceUguale}>=</Text>
            <View style={styles.voceTotaleBox}>
              <Text style={styles.voceCostoLabel}>TOTALE</Text>
              <Text style={styles.voceTotale}>
                €{((parseFloat(v.quantita) || 1) * (parseFloat(v.costo) || 0)).toFixed(0)}
              </Text>
            </View>
          </View>
        </View>
      ))}

      {/* Toggle IVA */}
      <View style={styles.ivaRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.ivaLabel}>Applica IVA 22%</Text>
          <Text style={styles.ivaSub}>
            {includiIva ? 'Regime ordinario' : 'Regime forfettario / esente IVA'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.ivaToggle, includiIva && styles.ivaToggleActive]}
          onPress={onToggleIva}
        >
          <Text style={styles.ivaToggleText}>{includiIva ? 'ON' : 'OFF'}</Text>
        </TouchableOpacity>
      </View>

      {/* Riepilogo totali */}
      <View style={styles.riepilogo}>
        {includiIva && (
          <>
            <View style={styles.riepilogoRow}>
              <Text style={styles.riepilogoLabel}>Imponibile</Text>
              <Text style={styles.riepilogoVal}>€{totale.toFixed(0)}</Text>
            </View>
            <View style={styles.riepilogoRow}>
              <Text style={styles.riepilogoLabel}>IVA 22%</Text>
              <Text style={styles.riepilogoVal}>€{(totale * 0.22).toFixed(0)}</Text>
            </View>
          </>
        )}
        <View style={[styles.riepilogoRow, styles.riepilogoTotale]}>
          <Text style={styles.riepilogoTotaleLabel}>TOTALE</Text>
          <Text style={styles.riepilogoTotaleVal}>€{totaleConIva.toFixed(0)}</Text>
        </View>
        {!includiIva && <Text style={styles.forfettarioNote}>Operazione esente IVA — Regime Forfettario</Text>}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#0D1B2A' },
  cardSub: { fontSize: 12, color: '#9CA3AF', marginTop: -6 },
  voceRow: { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10, gap: 8 },
  voceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  voceNome: { fontSize: 14, fontWeight: '600', color: '#0D1B2A' },
  voceRemove: { fontSize: 16, color: '#9CA3AF', padding: 4 },
  voceDesc: { backgroundColor: '#F7F8FA', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', padding: 8, fontSize: 12, color: '#374151' },
  voceCostoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  voceCostoBox: { flex: 1, gap: 2 },
  voceCostoLabel: { fontSize: 9, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.5 },
  voceCostoInput: { backgroundColor: '#F7F8FA', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', padding: 8, fontSize: 14, color: '#0D1B2A', textAlign: 'center' as const, fontWeight: '600' as const },
  voceMoltiply: { fontSize: 16, color: '#9CA3AF', marginTop: 12 },
  voceUguale: { fontSize: 16, color: '#9CA3AF', marginTop: 12 },
  voceTotaleBox: { flex: 1, gap: 2 },
  voceTotale: { fontSize: 16, fontWeight: '700', color: '#0E9F8E', textAlign: 'center' as const, paddingVertical: 8 },
  ivaRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  ivaLabel: { fontSize: 14, fontWeight: '500', color: '#0D1B2A' },
  ivaSub: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  ivaToggle: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  ivaToggleActive: { backgroundColor: '#0D1B2A', borderColor: '#0D1B2A' },
  ivaToggleText: { fontSize: 12, fontWeight: '700' as const, color: '#fff' },
  riepilogo: { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 10, gap: 6 },
  riepilogoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  riepilogoLabel: { fontSize: 13, color: '#6B7280' },
  riepilogoVal: { fontSize: 13, color: '#374151' },
  riepilogoTotale: { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 8, marginTop: 4 },
  riepilogoTotaleLabel: { fontSize: 15, fontWeight: '700', color: '#0D1B2A' },
  riepilogoTotaleVal: { fontSize: 18, fontWeight: '700', color: '#0E9F8E' },
  forfettarioNote: { fontSize: 11, color: '#0E9F8E', fontStyle: 'italic' as const, marginTop: 4 },
})
