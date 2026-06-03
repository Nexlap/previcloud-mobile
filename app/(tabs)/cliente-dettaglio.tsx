import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import {
    ActivityIndicator, Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text, TouchableOpacity,
    View
} from 'react-native'
import { supabase } from '../../lib/supabase'

interface Preventivo {
  id: string
  testo_preventivo: string | null
  importo_totale: number | null
  stato: string
  versione: number | null
  is_ultimo: boolean
  created_at: string
  template: string | null
}

interface Trascrizione {
  id: string
  titolo: string | null
  testo: string | null
  durata_secondi: number | null
  created_at: string
}

interface Cliente {
  id: string
  nome: string
  telefono: string | null
  email: string | null
  indirizzo: string | null
  note: string | null
}

export default function ClienteDettaglio() {
  const { id, nome } = useLocalSearchParams<{ id: string, nome: string }>()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [preventivi, setPreventivi] = useState<Preventivo[]>([])
  const [trascrizioni, setTrascrizioni] = useState<Trascrizione[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'preventivi' | 'chiamate'>('preventivi')
  const [aperto, setAperto] = useState<string | null>(null)
  const [modalStato, setModalStato] = useState<string | null>(null)

  useEffect(() => { carica() }, [])

  async function carica() {
    const { data: cl } = await supabase
      .from('clienti').select('*').eq('id', id).single()
    if (cl) setCliente(cl)

    const { data: prevs } = await supabase
      .from('preventivi').select('*')
      .eq('cliente_id', id)
      .order('created_at', { ascending: false })
    if (prevs) setPreventivi(prevs)

    const { data: trascr } = await supabase
      .from('trascrizioni').select('*')
      .eq('cliente_id', id)
      .order('created_at', { ascending: false })
    if (trascr) setTrascrizioni(trascr)

    setLoading(false)
  }
async function eliminaPreventivo(id: string) {
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
  async function eliminaCliente() {
    Alert.alert('Elimina cliente', 'Vuoi eliminare questo cliente? I preventivi associati non verranno eliminati.', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: async () => {
        await supabase.from('clienti').delete().eq('id', id)
        router.back()
      }}
    ])
  }

  const totaleValore = preventivi
    .filter(p => p.is_ultimo)
    .reduce((a, p) => a + (p.importo_totale || 0), 0)

  function formatDurata(sec: number | null) {
    if (!sec) return '—'
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, '0')}`
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
        <Text style={styles.headerTitle} numberOfLines={1}>{nome}</Text>
        <TouchableOpacity onPress={eliminaCliente} style={styles.deleteBtn}>
          <Text style={styles.deleteBtnText}>🗑</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16, gap: 12 }}>

        {/* Info cliente */}
        <View style={styles.card}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(cliente?.nome || 'C').charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.avatarInfo}>
              <Text style={styles.clienteNome}>{cliente?.nome}</Text>
              {cliente?.telefono && <Text style={styles.clienteInfo}>📞 {cliente.telefono}</Text>}
              {cliente?.email && <Text style={styles.clienteInfo}>✉️ {cliente.email}</Text>}
              {cliente?.indirizzo && <Text style={styles.clienteInfo}>📍 {cliente.indirizzo}</Text>}
              {cliente?.note && <Text style={styles.clienteNote}>{cliente.note}</Text>}
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{preventivi.filter(p => p.is_ultimo).length}</Text>
            <Text style={styles.statLabel}>Preventivi</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statVal, { color: '#0E9F8E' }]}>€{totaleValore.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Valore totale</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{trascrizioni.length}</Text>
            <Text style={styles.statLabel}>Chiamate</Text>
          </View>
        </View>

        {/* Tab */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'preventivi' && styles.tabBtnActive]}
            onPress={() => setTab('preventivi')}>
            <Text style={[styles.tabText, tab === 'preventivi' && styles.tabTextActive]}>
              Preventivi
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'chiamate' && styles.tabBtnActive]}
            onPress={() => setTab('chiamate')}>
            <Text style={[styles.tabText, tab === 'chiamate' && styles.tabTextActive]}>
              Chiamate
            </Text>
          </TouchableOpacity>
        </View>

        {/* Preventivi */}
        {tab === 'preventivi' && (
          preventivi.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Nessun preventivo per questo cliente</Text>
              <TouchableOpacity style={styles.emptyBtn}
                onPress={() => router.push('/(tabs)/nuovo')}>
                <Text style={styles.emptyBtnText}>Genera preventivo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            preventivi.map(p => (
              <TouchableOpacity
                key={p.id}
                style={[styles.prevCard, !p.is_ultimo && styles.prevCardOld]}
                onPress={() => setAperto(aperto === p.id ? null : p.id)}
              >
                <View style={styles.prevRow}>
                  <View style={styles.prevLeft}>
                    <View style={styles.prevBadgeRow}>
                      <Text style={styles.prevVersione}>v{p.versione || 1}</Text>
                      {p.is_ultimo && <Text style={styles.prevUltimo}>● attivo</Text>}
                    </View>
                    <Text style={styles.prevData}>
                      {new Date(p.created_at).toLocaleDateString('it-IT')}
                    </Text>
                  </View>
                  <View style={styles.prevRightRow}>
  <TouchableOpacity
    style={styles.prevRight}
    onPress={() => setModalStato(p.id)}
  >
    <Text style={styles.prevImporto}>{p.importo_totale ? `€${p.importo_totale}` : '—'}</Text>
    <Text style={[styles.prevStato,
      p.stato === 'accettato' ? { color: '#0E9F8E' } :
      p.stato === 'rifiutato' ? { color: '#EF4444' } :
      p.stato === 'inviato' ? { color: '#1D4ED8' } : {}
    ]}>{p.stato} ▼</Text>
  </TouchableOpacity>
  <TouchableOpacity onPress={() => eliminaPreventivo(p.id)}>
    <Text style={{ fontSize: 16 }}>🗑</Text>
  </TouchableOpacity>
</View>
                </View>
{aperto === p.id && p.testo_preventivo && (
  <View style={styles.prevDetail}>
    <Text style={styles.prevTesto}>{p.testo_preventivo}</Text>

    <TouchableOpacity
      style={styles.statoDropdown}
      onPress={() => setModalStato(p.id)}
    >
      <Text style={styles.statoDropdownText}>
        Stato: <Text style={styles.statoDropdownVal}>{p.stato}</Text>
      </Text>
      <Text style={styles.statoDropdownArrow}>▼</Text>
    </TouchableOpacity>

    {p.is_ultimo && (
      <TouchableOpacity
        style={styles.editBtn}
        onPress={() => router.push({
          pathname: '/(tabs)/preventivo-pdf',
          params: {
            testo: p.testo_preventivo || '',
            versione_padre_id: p.id,
            cliente_id: id
          }
        })}>
        <Text style={styles.editBtnText}>✏️ Modifica e genera v{(p.versione || 1) + 1}</Text>
      </TouchableOpacity>
    )}

    <TouchableOpacity onPress={() => eliminaPreventivo(p.id)}>
      <Text style={{ fontSize: 13, color: '#EF4444' }}>🗑 Elimina preventivo</Text>
    </TouchableOpacity>
  </View>
)}
              </TouchableOpacity>
            ))
          )
        )}

        {/* Chiamate */}
        {tab === 'chiamate' && (
          trascrizioni.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Nessuna chiamata registrata</Text>
            </View>
          ) : (
            trascrizioni.map(t => (
              <TouchableOpacity
                key={t.id}
                style={styles.chiamataCard}
                onPress={() => setAperto(aperto === t.id ? null : t.id)}
              >
                <View style={styles.chiamataRow}>
                  <View>
                    <Text style={styles.chiamataTitolo}>{t.titolo || 'Chiamata'}</Text>
                    <Text style={styles.chiamataData}>
                      {new Date(t.created_at).toLocaleDateString('it-IT')} · {formatDurata(t.durata_secondi)}
                    </Text>
                  </View>
                  <Text style={styles.chiamataArrow}>{aperto === t.id ? '▲' : '▼'}</Text>
                </View>
                {aperto === t.id && t.testo && (
                  <View style={styles.chiamataDetail}>
                    <Text style={styles.chiamataTesto}>{t.testo}</Text>
                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => router.push({
                        pathname: '/(tabs)/nuovo',
                        params: { trascrizione: t.testo }
                      })}>
                      <Text style={styles.editBtnText}>💬 Genera preventivo da questa chiamata</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
      <Modal
  visible={modalStato !== null}
  transparent
  animationType="fade"
  onRequestClose={() => setModalStato(null)}
>
  <TouchableOpacity
    style={styles.modalOverlay}
    activeOpacity={1}
    onPress={() => setModalStato(null)}
  >
    <View style={styles.modalBox}>
      <Text style={styles.modalTitle}>Cambia stato</Text>
      {['bozza', 'inviato', 'accettato', 'rifiutato'].map(s => (
        <TouchableOpacity
          key={s}
          style={styles.modalOption}
          onPress={() => {
            if (modalStato) cambiaStato(modalStato, s)
            setModalStato(null)
          }}
        >
          <Text style={styles.modalOptionIcon}>
            {s === 'bozza' ? '📝' : s === 'inviato' ? '📤' : s === 'accettato' ? '✅' : '❌'}
          </Text>
          <Text style={styles.modalOptionText}>{s}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={styles.modalCancel} onPress={() => setModalStato(null)}>
        <Text style={styles.modalCancelText}>Annulla</Text>
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
</Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#0D1B2A', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { padding: 4, width: 50 },
  backText: { color: '#9CA3AF', fontSize: 22 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '600', flex: 1, textAlign: 'center' },
  deleteBtn: { width: 50, alignItems: 'flex-end' },
  deleteBtnText: { fontSize: 20 },
  scroll: { flex: 1 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  avatarRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#0D1B2A', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  avatarInfo: { flex: 1, gap: 3 },
  clienteNome: { fontSize: 18, fontWeight: '700', color: '#0D1B2A' },
  clienteInfo: { fontSize: 13, color: '#6B7280' },
  clienteNote: { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic', marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  statVal: { fontSize: 20, fontWeight: '700', color: '#0D1B2A' },
  statLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 4, borderWidth: 1, borderColor: '#E5E7EB' },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' as const },
  tabBtnActive: { backgroundColor: '#0D1B2A' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#9CA3AF' },
  tabTextActive: { color: '#fff' },
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 14, color: '#9CA3AF', marginBottom: 12 },
  emptyBtn: { backgroundColor: '#0D1B2A', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  emptyBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  prevCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  prevCardOld: { opacity: 0.6 },
  prevRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  prevLeft: { flex: 1 },
  prevBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  prevVersione: { fontSize: 13, fontWeight: '700', color: '#0D1B2A' },
  prevUltimo: { fontSize: 11, color: '#0E9F8E', fontWeight: '600' },
  prevData: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  prevRight: { alignItems: 'flex-end' },
  prevImporto: { fontSize: 14, fontWeight: '600', color: '#0D1B2A' },
  prevStato: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  prevDetail: { padding: 14, borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 10 },
  prevTesto: { fontSize: 12, color: '#6B7280', lineHeight: 18, fontFamily: 'monospace' },
  editBtn: { backgroundColor: '#0D1B2A', borderRadius: 10, padding: 10, alignItems: 'center' as const },
  editBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  chiamataCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  chiamataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  chiamataTitolo: { fontSize: 14, fontWeight: '500', color: '#0D1B2A' },
  chiamataData: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  chiamataArrow: { fontSize: 12, color: '#9CA3AF' },
  chiamataDetail: { padding: 14, borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 10 },
  chiamataTesto: { fontSize: 12, color: '#6B7280', lineHeight: 18 },
  statoDropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' as const, backgroundColor: '#F7F8FA', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' },
statoDropdownText: { fontSize: 13, color: '#6B7280' },
statoDropdownVal: { fontWeight: '600' as const, color: '#0D1B2A' },
statoDropdownArrow: { fontSize: 11, color: '#9CA3AF' },
modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center' as const, alignItems: 'center' as const, padding: 32 },
modalBox: { backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '100%' },
modalTitle: { fontSize: 16, fontWeight: '600' as const, color: '#0D1B2A', marginBottom: 16, textAlign: 'center' as const },
modalOption: { flexDirection: 'row', alignItems: 'center' as const, gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
modalOptionIcon: { fontSize: 20 },
modalOptionText: { fontSize: 15, color: '#0D1B2A', fontWeight: '500' as const, textTransform: 'capitalize' as const },
modalCancel: { paddingTop: 14, alignItems: 'center' as const },
modalCancelText: { fontSize: 14, color: '#9CA3AF' },
prevRightRow: { alignItems: 'flex-end' as const, gap: 6 },
})