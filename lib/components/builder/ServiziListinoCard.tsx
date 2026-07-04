import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Servizio, VocePreventivo } from '../../types'
import { formatImportoEuroVisuale } from 'previcloud-shared'

type Props = {
  servizi: Servizio[]
  voci: VocePreventivo[]
  onConfiguraServizi: () => void
  onAggiungiVoce: (servizio: Servizio) => void
  onRimuoviVoce: (servizioId: string) => void
  onAggiungiVoceCustom: () => void
}

export function ServiziListinoCard({ servizi, voci, onConfiguraServizi, onAggiungiVoce, onRimuoviVoce, onAggiungiVoceCustom }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>I tuoi servizi</Text>
      <Text style={styles.cardSub}>Tocca + per aggiungere, ✓ per rimuovere</Text>
      {servizi.length === 0 ? (
        <TouchableOpacity onPress={onConfiguraServizi}>
          <Text style={styles.emptyText}>Nessun servizio configurato — tocca qui per aggiungerli</Text>
        </TouchableOpacity>
      ) : servizi.map(s => {
        const aggiunto = voci.some(v => v.servizio_id === s.id)
        return (
        <View key={s.id} style={styles.servizioRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.servizioNome}>{s.nome}</Text>
            {s.costo ? <Text style={styles.servizioCosto}>€{formatImportoEuroVisuale(s.costo)}/{s.unita}</Text> : null}
          </View>
          <TouchableOpacity
            style={[styles.addBtn, aggiunto && styles.addBtnDone]}
            onPress={() => aggiunto ? onRimuoviVoce(s.id) : onAggiungiVoce(s)}
          >
            <Text style={[styles.addBtnText, aggiunto && styles.addBtnTextDone]}>{aggiunto ? '✓' : '+'}</Text>
          </TouchableOpacity>
        </View>
        )
      })}
      <TouchableOpacity style={styles.customVoiceBtn} onPress={onAggiungiVoceCustom}>
        <Text style={styles.customVoiceText}>{'+ Aggiungi voce personalizzata'}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', gap: 10, shadowColor: '#0D1B2A', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#0D1B2A' },
  cardSub: { fontSize: 12, color: '#9CA3AF', marginTop: -6 },
  emptyText: { fontSize: 13, color: '#0B7A6D', textAlign: 'center' as const, padding: 16 },
  servizioRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  servizioNome: { fontSize: 14, fontWeight: '500', color: '#0D1B2A' },
  servizioCosto: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  addBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#0E9F8E', justifyContent: 'center', alignItems: 'center' },
  addBtnDone: { backgroundColor: '#D1FAE5' },
  addBtnText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  addBtnTextDone: { color: '#0B7A6D' },
  customVoiceBtn: { marginTop: 8, borderRadius: 12, borderWidth: 1.5, borderColor: '#0E9F8E', borderStyle: 'dashed' as const, padding: 12, alignItems: 'center' as const, backgroundColor: '#F0FDF4' },
  customVoiceText: { fontSize: 14, color: '#0B7A6D', fontWeight: '600' },
})
