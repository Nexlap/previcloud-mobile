import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator, Alert,
  ScrollView,
  StyleSheet,
  Text, TouchableOpacity,
  View
} from 'react-native'
import { supabase } from '../../lib/supabase'

interface Preventivo {
  id: string
  nome_cliente: string | null
  importo_totale: number | null
  stato: string
  testo_preventivo: string | null
  created_at: string
  versione: number | null
}

export default function Storico() {
  const [preventivi, setPreventivi] = useState<Preventivo[]>([])
  const [loading, setLoading] = useState(true)
  const [aperto, setAperto] = useState<string | null>(null)

  useEffect(() => { carica() }, [])

  async function carica() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/(auth)/login'); return }
    const { data } = await supabase
      .from('preventivi').select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setPreventivi(data)
    setLoading(false)
  }

  async function elimina(id: string) {
    Alert.alert('Elimina', 'Vuoi eliminare questo preventivo?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: async () => {
        await supabase.from('preventivi').delete().eq('id', id)
        setPreventivi(p => p.filter(x => x.id !== id))
      }}
    ])
  }

  async function cambiaStato(id: string, stato: string) {
    await supabase.from('preventivi').update({ stato }).eq('id', id)
    setPreventivi(p => p.map(x => x.id === id ? { ...x, stato } : x))
  }

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#0E9F8E" />
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Storico preventivi</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16, gap: 10 }}>
        {preventivi.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Nessun preventivo salvato.</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(tabs)/nuovo')}>
              <Text style={styles.emptyBtnText}>Genera il primo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          preventivi.map(p => (
            <View key={p.id} style={styles.card}>
              <TouchableOpacity style={styles.cardRow} onPress={() => setAperto(aperto === p.id ? null : p.id)}>
                <View style={styles.cardIcon}>
                  <Text style={styles.cardIconText}>📄</Text>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardCliente}>{p.nome_cliente || 'Cliente'}</Text>
                  <Text style={styles.cardData}>
                    {new Date(p.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </Text>
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.cardImporto}>{p.importo_totale ? `€${p.importo_totale}` : '—'}</Text>
                  <Text style={[styles.cardStato,
                    p.stato === 'accettato' ? { color: '#0E9F8E' } :
                    p.stato === 'rifiutato' ? { color: '#EF4444' } : {}
                  ]}>{p.stato}</Text>
                </View>
              </TouchableOpacity>

              {aperto === p.id && (
                <View style={styles.detail}>
                  {p.testo_preventivo && (
                    <Text style={styles.detailText}>{p.testo_preventivo}</Text>
                  )}
                  <View style={styles.detailActions}>
                    {['bozza', 'inviato', 'accettato', 'rifiutato'].map(s => (
                      <TouchableOpacity key={s}
                        style={[styles.statoBtn, p.stato === s && styles.statoBtnActive]}
                        onPress={() => cambiaStato(p.id, s)}>
                        <Text style={[styles.statoBtnText, p.stato === s && styles.statoBtnTextActive]}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => elimina(p.id)}>
                    <Text style={styles.deleteBtnText}>🗑 Elimina</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
  style={styles.editBtn}
  onPress={() => router.push({
    pathname: '/(tabs)/preventivo-pdf',
    params: {
      testo: p.testo_preventivo || '',
      versione_padre_id: p.id
    }
  })}
>
  <Text style={styles.editBtnText}>
    ✏️ Modifica e genera v{(p.versione || 1) + 1}
  </Text>
</TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F8FA' },
  header: { backgroundColor: '#0D1B2A', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { padding: 4, width: 50 },
  backText: { color: '#9CA3AF', fontSize: 22 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  scroll: { flex: 1 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 15, color: '#9CA3AF', marginBottom: 16 },
  emptyBtn: { backgroundColor: '#0D1B2A', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  cardRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  cardIcon: { width: 38, height: 38, backgroundColor: '#F0FDF4', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardIconText: { fontSize: 18 },
  cardBody: { flex: 1 },
  cardCliente: { fontSize: 14, fontWeight: '500', color: '#0D1B2A' },
  cardData: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  cardRight: { alignItems: 'flex-end' },
  cardImporto: { fontSize: 14, fontWeight: '600', color: '#0D1B2A' },
  cardStato: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  detail: { borderTopWidth: 1, borderTopColor: '#F3F4F6', padding: 14 },
  detailText: { fontSize: 12, lineHeight: 20, color: '#6B7280', marginBottom: 12, fontFamily: 'monospace' },
  detailActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  statoBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  statoBtnActive: { backgroundColor: '#0D1B2A', borderColor: '#0D1B2A' },
  statoBtnText: { fontSize: 12, color: '#6B7280' },
  statoBtnTextActive: { color: '#fff' },
  deleteBtn: { alignSelf: 'flex-start' },
  deleteBtnText: { fontSize: 13, color: '#EF4444' },
  editBtn: { backgroundColor: '#0D1B2A', borderRadius: 10, padding: 10, alignItems: 'center' as const, marginBottom: 8 },
 editBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' as const },
})