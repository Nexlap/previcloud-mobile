import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator, Alert, Modal, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
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
  is_ultimo: boolean
  cliente_id: string | null
  preventivo_padre_id: string | null
  clienti?: { nome: string } | null
  titolo: string | null
}

export default function Storico() {
  const [preventivi, setPreventivi] = useState<Preventivo[]>([])
  const [loading, setLoading] = useState(true)
  const [aperto, setAperto] = useState<string | null>(null)
  const [modalStato, setModalStato] = useState<string | null>(null)
  const [cronologiaAperta, setCronologiaAperta] = useState<string | null>(null)
  const [cronologia, setCronologia] = useState<{[key: string]: Preventivo[]}>({})

  useEffect(() => { carica() }, [])

  async function carica() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/(auth)/login'); return }
    const { data } = await supabase
      .from('preventivi')
      .select('*, clienti(nome)')
      .eq('user_id', user.id)
      .eq('is_ultimo', true)
      .order('created_at', { ascending: false })
    if (data) setPreventivi(data.map((p: any) => ({
      ...p,
      nome_cliente: p.clienti?.nome || p.nome_cliente || 'Senza cliente'
    })))
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

async function caricaCronologia(preventivoId: string, padreId: string | null) {
  if (cronologiaAperta === preventivoId) {
    setCronologiaAperta(null)
    return
  }

  if (!padreId) return

  // Risali tutta la catena dei padri
  const versioni: Preventivo[] = []
  let currentId: string | null = padreId

  while (currentId) {
    const { data }: { data: Preventivo | null } = await supabase
      .from('preventivi')
      .select('*')
      .eq('id', currentId)
      .single()

    if (!data) break
    versioni.unshift(data)
    currentId = data.preventivo_padre_id
  }

  if (versioni.length > 0) {
    setCronologia(c => ({ ...c, [preventivoId]: versioni }))
    setCronologiaAperta(preventivoId)
  }
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
<View style={styles.cardRowContainer}>
  <TouchableOpacity style={[styles.cardRow, { flex: 1 }]} onPress={() => {
    if (p.cliente_id) {
      router.push({ pathname: '/(tabs)/cliente-dettaglio', params: { id: p.cliente_id, nome: p.nome_cliente || 'Cliente' } })
    } else {
      setAperto(aperto === p.id ? null : p.id)
    }
  }}>
    <View style={styles.cardIcon}>
      <Text style={styles.cardIconText}>📄</Text>
    </View>
    <View style={styles.cardBody}>
      <Text style={styles.cardCliente}>{p.nome_cliente || 'Senza cliente'}</Text>
      <Text style={styles.cardCliente}>{p.nome_cliente || 'Senza cliente'}</Text>
      {p.titolo && <Text style={styles.cardTitolo}>{p.titolo}</Text>}
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
  <TouchableOpacity
    style={styles.cardMenuBtn}
    onPress={() => setAperto(aperto === p.id ? null : p.id)}
  >
    <Text style={styles.cardMenuBtnText}>⋯</Text>
  </TouchableOpacity>
</View>
              {aperto === p.id && (
                <View style={styles.detail}>
                  {p.testo_preventivo && (
                    <Text style={styles.detailText}>{p.testo_preventivo}</Text>
                  )}

                  <TouchableOpacity
                    style={styles.statoDropdown}
                    onPress={() => setModalStato(p.id)}
                  >
                    <Text style={styles.statoDropdownText}>
                      Stato: <Text style={styles.statoDropdownVal}>{p.stato}</Text>
                    </Text>
                    <Text style={styles.statoDropdownArrow}>▼</Text>
                  </TouchableOpacity>

                  {p.versione && p.versione > 1 && (
                    <TouchableOpacity
                      style={styles.cronologiaBtn}
                      onPress={() => caricaCronologia(p.id, p.preventivo_padre_id)}
                    >
                      <Text style={styles.cronologiaBtnText}>
                        {cronologiaAperta === p.id
                          ? '▲ Nascondi cronologia'
                          : `▼ Mostra cronologia (${p.versione - 1} vers. precedenti)`}
                      </Text>
                    </TouchableOpacity>
                  )}

{cronologiaAperta === p.id && cronologia[p.id]?.map(v => (
  <TouchableOpacity
    key={v.id}
    style={styles.cronologiaItem}
    onPress={() => setAperto(aperto === v.id ? p.id : v.id)}
  >
    <Text style={styles.cronologiaVer}>v{v.versione || 1}</Text>
    <Text style={styles.cronologiaData}>{new Date(v.created_at).toLocaleDateString('it-IT')}</Text>
    <Text style={styles.cronologiaImporto}>{v.importo_totale ? `€${v.importo_totale}` : '—'}</Text>
  </TouchableOpacity>
))}

{cronologiaAperta === p.id && cronologia[p.id]?.map(v => (
  aperto === v.id && (
    <View key={`detail-${v.id}`} style={styles.cronologiaDetail}>
      <Text style={styles.prevTesto}>{v.testo_preventivo}</Text>
      <TouchableOpacity
        style={styles.ripristinaBtn}
        onPress={async () => {
          Alert.alert(
            'Ripristina versione',
            `Vuoi ripristinare la v${v.versione || 1}? La versione attuale diventerà inattiva.`,
            [
              { text: 'Annulla', style: 'cancel' },
              { text: 'Ripristina', onPress: async () => {
                // Disattiva versione corrente
                await supabase.from('preventivi').update({ is_ultimo: false }).eq('id', p.id)
                // Attiva versione vecchia
                await supabase.from('preventivi').update({ is_ultimo: true }).eq('id', v.id)
                Alert.alert('✓ Ripristinato', `La v${v.versione || 1} è ora la versione attiva.`)
                carica()
                setAperto(null)
                setCronologiaAperta(null)
              }}
            ]
          )
        }}
      >
        <Text style={styles.ripristinaBtnText}>↩ Ripristina questa versione</Text>
      </TouchableOpacity>
    </View>
  )
))}
{p.stato === 'bozza' && (
  <TouchableOpacity
    style={styles.riprendiBtn}
    onPress={() => router.push({
      pathname: '/(tabs)/nuovo',
      params: { preventivo_id: p.id }
    })}
  >
    <Text style={styles.riprendiBtnText}>💬 Riprendi bozza</Text>
  </TouchableOpacity>
)}
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => router.push({
                      pathname: '/(tabs)/preventivo-pdf',
                      params: { testo: p.testo_preventivo || '', versione_padre_id: p.id }
                    })}
                  >
                    <Text style={styles.editBtnText}>✏️ Modifica e genera v{(p.versione || 1) + 1}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.deleteBtn} onPress={() => elimina(p.id)}>
                    <Text style={styles.deleteBtnText}>🗑 Elimina</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
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
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB' },  cardRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  cardIcon: { width: 38, height: 38, backgroundColor: '#F0FDF4', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardIconText: { fontSize: 18 },
  cardBody: { flex: 1 },
  cardCliente: { fontSize: 14, fontWeight: '500', color: '#0D1B2A' },
  cardData: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  cardRight: { alignItems: 'flex-end' as const },
  cardImporto: { fontSize: 14, fontWeight: '600', color: '#0D1B2A' },
  cardStato: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  detail: { borderTopWidth: 1, borderTopColor: '#F3F4F6', padding: 14, gap: 8 },
  detailText: { fontSize: 12, lineHeight: 20, color: '#6B7280', marginBottom: 4, fontFamily: 'monospace' },
  statoDropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F7F8FA', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  statoDropdownText: { fontSize: 13, color: '#6B7280' },
  statoDropdownVal: { fontWeight: '600', color: '#0D1B2A' },
  statoDropdownArrow: { fontSize: 11, color: '#9CA3AF' },
  cronologiaBtn: { paddingVertical: 8, alignItems: 'center' as const },
  cronologiaBtnText: { fontSize: 13, color: '#0E9F8E', fontWeight: '500' },
  cronologiaItem: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#F7F8FA', borderRadius: 8, padding: 10 },
  cronologiaVer: { fontSize: 13, fontWeight: '700', color: '#9CA3AF' },
  cronologiaData: { fontSize: 12, color: '#9CA3AF' },
  cronologiaImporto: { fontSize: 12, color: '#9CA3AF' },
  editBtn: { backgroundColor: '#0D1B2A', borderRadius: 10, padding: 10, alignItems: 'center' as const },
  editBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' as const },
  deleteBtn: { alignSelf: 'flex-start' as const },
  deleteBtnText: { fontSize: 13, color: '#EF4444' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  modalBox: { backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '100%' },
  modalTitle: { fontSize: 16, fontWeight: '600', color: '#0D1B2A', marginBottom: 16, textAlign: 'center' as const },
  modalOption: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalOptionIcon: { fontSize: 20 },
  modalOptionText: { fontSize: 15, color: '#0D1B2A', fontWeight: '500' as const, textTransform: 'capitalize' as const },
  modalCancel: { paddingTop: 14, alignItems: 'center' as const },
  modalCancelText: { fontSize: 14, color: '#9CA3AF' },
  cronologiaDetail: { backgroundColor: '#F7F8FA', borderRadius: 10, padding: 12, marginTop: 4, gap: 10 },
ripristinaBtn: { backgroundColor: '#0D1B2A', borderRadius: 10, padding: 10, alignItems: 'center' as const },
ripristinaBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' as const },
prevTesto: { fontSize: 12, lineHeight: 20, color: '#6B7280', fontFamily: 'monospace' },
cardRowContainer: { flexDirection: 'row', alignItems: 'center' },
cardMenuBtn: { paddingHorizontal: 14, paddingVertical: 20 },
cardMenuBtnText: { fontSize: 22, color: '#9CA3AF' },
cardTitolo: { fontSize: 11, color: '#0E9F8E', marginTop: 1 },
riprendiBtn: { backgroundColor: '#0E9F8E', borderRadius: 10, padding: 10, alignItems: 'center' as const, marginBottom: 8 },
riprendiBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' as const },
})