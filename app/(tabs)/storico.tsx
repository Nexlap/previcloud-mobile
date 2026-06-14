import * as FileSystem from 'expo-file-system/legacy'
import { router } from 'expo-router'
import * as Sharing from 'expo-sharing'
import { useState } from 'react'
import {
  ActivityIndicator, Alert, Modal, RefreshControl, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native'
import { eventBus } from "../../lib/eventBus"
import { usePreventivi } from "../../lib/hooks/usePreventivi"
import { supabase } from "../../lib/supabase"
import { Preventivo } from "../../lib/types"

export default function Storico() {
  const { preventivi, loading, refreshing, onRefresh, cambiaStato, eliminaPreventivo } = usePreventivi()
  const [aperto, setAperto] = useState<string | null>(null)
  const [modalStato, setModalStato] = useState<string | null>(null)
  const [cronologiaAperta, setCronologiaAperta] = useState<string | null>(null)
  const [cronologia, setCronologia] = useState<{ [key: string]: Preventivo[] }>({})

  async function scaricaPDF(p: Preventivo) {
    if (p.pdf_url) {
      try {
        const fileName = `${FileSystem.cacheDirectory}preventivo_${p.id}.pdf`
        const { uri } = await FileSystem.downloadAsync(p.pdf_url, fileName)
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Apri preventivo', UTI: 'com.adobe.pdf' })
      } catch {
        Alert.alert('Errore', 'Impossibile aprire il PDF')
      }
    } else {
      router.push({ pathname: '/screens/preventivo-pdf', params: { testo: p.testo_preventivo || '', cliente_id: p.cliente_id || '' } })
    }
  }

  async function elimina(id: string) {
    Alert.alert('Elimina', 'Vuoi eliminare questo preventivo?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: () => eliminaPreventivo(id) }
    ])
  }

  // Risale la catena delle versioni precedenti
  async function caricaCronologia(preventivoId: string, padreId: string | null) {
    if (cronologiaAperta === preventivoId) { setCronologiaAperta(null); return }
    if (!padreId) return
    const versioni: Preventivo[] = []
    let currentId: string | null = padreId
    while (currentId) {
      const result = await supabase.from('preventivi').select('*').eq('id', currentId).single()
      const data = result.data as Preventivo | null
      if (!data) break
      versioni.unshift(data as Preventivo)
      currentId = (data as Preventivo).preventivo_padre_id
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
        <Text style={styles.headerTitle}>Storico preventivi</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0E9F8E" colors={["#0E9F8E"]} />}
      >
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
  {/* Tap su card: apre cartella cliente o espande dettaglio */}
  <TouchableOpacity style={[styles.cardRow, { flex: 1 }]} onPress={() => {
    if (p.cliente_id) {
      router.push({ pathname: '/screens/cliente-dettaglio', params: { id: p.cliente_id, nome: p.nome_cliente || 'Cliente' } })
    } else {
      setAperto(aperto === p.id ? null : p.id)
    }
  }}>
    <View style={styles.cardIcon}>
      <Text style={styles.cardIconText}>📄</Text>
    </View>
    <View style={styles.cardBody}>
      <Text style={styles.cardCliente}>{p.nome_cliente || 'Senza cliente'}</Text>
      {p.titolo && <Text style={styles.cardTitolo}>{p.titolo}</Text>}
      <Text style={styles.cardData}>
        {new Date(p.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
      </Text>
    </View>
  </TouchableOpacity>

  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 12 }}>
    <TouchableOpacity style={{ alignItems: 'flex-end' }} onPress={() => setModalStato(p.id)}>
      <Text style={styles.cardImporto}>{p.importo_totale ? `€${p.importo_totale}` : '—'}</Text>
      <Text style={[styles.cardStato,
        p.stato === 'accettato' ? { color: '#0E9F8E' } :
        p.stato === 'rifiutato' ? { color: '#EF4444' } :
        p.stato === 'inviato' ? { color: '#1D4ED8' } : {}
      ]}>{`${p.stato || 'bozza'} ▼`}</Text>
    </TouchableOpacity>
    <TouchableOpacity onPress={() => scaricaPDF(p)}>
      <Text style={{ fontSize: 16 }}>{p.pdf_url ? '📄' : '🔄'}</Text>
    </TouchableOpacity>
    <TouchableOpacity onPress={() => elimina(p.id)}>
      <Text style={{ fontSize: 16 }}>🗑</Text>
    </TouchableOpacity>
  </View>
</View>

              {/* Dettaglio espanso */}
              {aperto === p.id && (
                <View style={styles.detail}>
                  {p.testo_preventivo && <Text style={styles.detailText}>{p.testo_preventivo}</Text>}

                  {/* Cronologia versioni */}
                  {p.versione && p.versione > 1 && (
                    <TouchableOpacity style={styles.cronologiaBtn} onPress={() => caricaCronologia(p.id, p.preventivo_padre_id)}>
                      <Text style={styles.cronologiaBtnText}>
                        {cronologiaAperta === p.id ? '▲ Nascondi cronologia' : `▼ Mostra cronologia (${p.versione - 1} vers. precedenti)`}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {cronologiaAperta === p.id && cronologia[p.id]?.map(v => (
                    <TouchableOpacity key={v.id} style={styles.cronologiaItem} onPress={() => setAperto(aperto === v.id ? p.id : v.id)}>
                      <Text style={styles.cronologiaVer}>{`v${v.versione || 1}`}</Text>
                      <Text style={styles.cronologiaData}>{new Date(v.created_at).toLocaleDateString('it-IT')}</Text>
                      <Text style={styles.cronologiaImporto}>{v.importo_totale ? `€${v.importo_totale}` : '—'}</Text>
                    </TouchableOpacity>
                  ))}

                  {cronologiaAperta === p.id && cronologia[p.id]?.map(v =>
                    aperto === v.id && (
                      <View key={`detail-${v.id}`} style={styles.cronologiaDetail}>
                        <Text style={styles.prevTesto}>{v.testo_preventivo}</Text>
                        <TouchableOpacity
                          style={styles.ripristinaBtn}
                          onPress={() => Alert.alert('Ripristina versione', `Vuoi ripristinare la v${v.versione || 1}?`, [
                            { text: 'Annulla', style: 'cancel' },
                            { text: 'Ripristina', onPress: async () => {
                              await supabase.from('preventivi').update({ is_ultimo: false }).eq('id', p.id)
                              await supabase.from('preventivi').update({ is_ultimo: true }).eq('id', v.id)
                              Alert.alert('✓ Ripristinato')
                              setAperto(null)
                              setCronologiaAperta(null)
                            }}
                          ])}
                        >
                          <Text style={styles.ripristinaBtnText}>↩ Ripristina questa versione</Text>
                        </TouchableOpacity>
                      </View>
                    )
                  )}

                  {p.stato === 'bozza' && (
                    <TouchableOpacity style={styles.riprendiBtn} onPress={() => router.push({ pathname: '/(tabs)/nuovo', params: { preventivo_id: p.id } })}>
                      <Text style={styles.riprendiBtnText}>💬 Riprendi bozza</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity style={styles.editBtn} onPress={() => router.push({
                    pathname: '/(tabs)/nuovo',
                    params: { testo_modifica: p.testo_preventivo || '', versione_padre_id: p.id, versione_numero: String((p.versione || 1) + 1) }
                  })}>
                    <Text style={styles.editBtnText}>{`✏️ Modifica e genera v${(p.versione || 1) + 1}`}</Text>
                  </TouchableOpacity>

                </View>
              )}
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal cambio stato */}
      <Modal visible={modalStato !== null} transparent animationType="fade" onRequestClose={() => setModalStato(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalStato(null)}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Cambia stato</Text>
            {['bozza', 'inviato', 'accettato', 'rifiutato'].map(s => (
              <TouchableOpacity key={s} style={styles.modalOption} onPress={() => {
                if (modalStato) { cambiaStato(modalStato, s); eventBus.emit('aggiorna-home') }
                setModalStato(null)
              }}>
                <Text style={styles.modalOptionIcon}>{s === 'bozza' ? '📝' : s === 'inviato' ? '📤' : s === 'accettato' ? '✅' : '❌'}</Text>
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
  header: { backgroundColor: '#0D1B2A', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  scroll: { flex: 1 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 15, color: '#9CA3AF', marginBottom: 16 },
  emptyBtn: { backgroundColor: '#0D1B2A', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  cardRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  cardIcon: { width: 38, height: 38, backgroundColor: '#F0FDF4', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardIconText: { fontSize: 18 },
  cardBody: { flex: 1 },
  cardCliente: { fontSize: 14, fontWeight: '500', color: '#0D1B2A' },
  cardData: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  cardRight: { alignItems: 'flex-end' as const },
  cardImporto: { fontSize: 14, fontWeight: '600', color: '#0D1B2A' },
  cardStato: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  cardActions: { flexDirection: 'row', alignItems: 'center' },
  cardActionBtn: { paddingHorizontal: 8, paddingVertical: 10 },
  cardActionIcon: { fontSize: 18 },
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
  cardMenuBtn: { paddingHorizontal: 10, paddingVertical: 10 },
  cardMenuBtnText: { fontSize: 22, color: '#9CA3AF' },
  cardTitolo: { fontSize: 11, color: '#0E9F8E', marginTop: 1 },
  riprendiBtn: { backgroundColor: '#0E9F8E', borderRadius: 10, padding: 10, alignItems: 'center' as const, marginBottom: 8 },
  riprendiBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' as const },
})
