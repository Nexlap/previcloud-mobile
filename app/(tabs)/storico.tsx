import * as FileSystem from 'expo-file-system/legacy'
import { router, useFocusEffect } from 'expo-router'
import * as Sharing from 'expo-sharing'
import { useCallback, useState } from 'react'
import {
  ActivityIndicator, Alert, Modal, RefreshControl, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native'
import { eventBus } from "../../lib/eventBus"
import { usePreventivi } from "../../lib/hooks/usePreventivi"
import { cambiaStatoPreventivi, caricaClientiPerSposta, caricaCronologiaPreventivo, eliminaPreventivi, ripristinaVersionePreventivo, spostaPreventivi } from '../../lib/api/storico'
import { Cliente, Preventivo } from "../../lib/types"
import { trackEvento } from "../../lib/utils/analytics"

export default function Storico() {
  const { preventivi, loading, refreshing, onRefresh, cambiaStato, eliminaPreventivo } = usePreventivi()
  const [aperto, setAperto] = useState<string | null>(null)
  const [modalStato, setModalStato] = useState<string | null>(null)
  const [modalStatoMultiplo, setModalStatoMultiplo] = useState(false)
  const [modalClienti, setModalClienti] = useState(false)
  const [clienti, setClienti] = useState<Cliente[]>([])
  const [caricandoClienti, setCaricandoClienti] = useState(false)
  const [cronologiaAperta, setCronologiaAperta] = useState<string | null>(null)
  const [cronologia, setCronologia] = useState<{ [key: string]: Preventivo[] }>({})
  const [selezioneAttiva, setSelezioneAttiva] = useState(false)
  const [preventiviSelezionati, setPreventiviSelezionati] = useState<string[]>([])
  const [preventiviEliminati, setPreventiviEliminati] = useState<string[]>([])
  const [preventiviSpostati, setPreventiviSpostati] = useState<{ [id: string]: { cliente_id: string, nome_cliente: string } }>({})
  const preventiviVisibili = preventivi
    .filter(p => !preventiviEliminati.includes(p.id))
    .map(p => preventiviSpostati[p.id] ? { ...p, ...preventiviSpostati[p.id] } : p)
  const selezionati = preventiviVisibili.filter(p => preventiviSelezionati.includes(p.id))

  useFocusEffect(useCallback(() => {
    trackEvento('storico_aperto', 'storico')
  }, []))

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

  function toggleSelezione(id: string) {
    setPreventiviSelezionati(ids => {
      const prossimi = ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]
      if (prossimi.length === 0) setSelezioneAttiva(false)
      return prossimi
    })
  }

  function avviaSelezione(id: string) {
    setAperto(null)
    setSelezioneAttiva(true)
    setPreventiviSelezionati(ids => ids.includes(id) ? ids : [...ids, id])
  }

  function annullaSelezione() {
    setSelezioneAttiva(false)
    setPreventiviSelezionati([])
  }

  async function eliminaSelezionati() {
    const ids = [...preventiviSelezionati]
    if (ids.length === 0) return
    Alert.alert('Elimina', `Eliminare ${ids.length} preventivi?`, [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: async () => {
          const { error } = await eliminaPreventivi(ids)
          if (error) { Alert.alert('Errore', error.message); return }
          setPreventiviEliminati(prev => [...prev, ...ids])
          annullaSelezione()
          eventBus.emit('aggiorna-home')
        }
      }
    ])
  }

  async function cambiaStatoSelezionati(stato: string) {
    const ids = [...preventiviSelezionati]
    if (ids.length === 0) return
    const { error } = await cambiaStatoPreventivi(ids, stato)
    if (error) { Alert.alert('Errore', error.message); return }
    setModalStatoMultiplo(false)
    annullaSelezione()
    eventBus.emit('aggiorna-home')
    await onRefresh()
  }

  async function condividiSelezionati() {
    const conPdf = selezionati.filter(p => p.pdf_url)
    if (conPdf.length === 0) {
      Alert.alert('Nessun PDF', 'I preventivi selezionati non hanno PDF da condividere.')
      return
    }
    if (conPdf.length > 1) {
      Alert.alert('Condivisione singola per ora', 'Condivido il primo PDF selezionato.')
    }
    await scaricaPDF(conPdf[0])
  }

  async function caricaClienti() {
    setCaricandoClienti(true)
    const { data, error } = await caricaClientiPerSposta()
    if (error) Alert.alert('Errore', error.message)
    else setClienti((data || []) as Cliente[])
    setCaricandoClienti(false)
  }

  async function apriSpostaCliente() {
    setModalClienti(true)
    if (clienti.length === 0) await caricaClienti()
  }

  async function spostaSelezionati(cliente: Cliente) {
    const ids = [...preventiviSelezionati]
    if (ids.length === 0) return
    const { error } = await spostaPreventivi(ids, cliente)
    if (error) { Alert.alert('Errore', error.message); return }
    setPreventiviSpostati(prev => ids.reduce((acc, id) => ({
      ...acc,
      [id]: { cliente_id: cliente.id, nome_cliente: cliente.nome },
    }), prev))
    setModalClienti(false)
    annullaSelezione()
    eventBus.emit('aggiorna-home')
    await onRefresh()
  }

  // Risale la catena delle versioni precedenti
  async function caricaCronologia(preventivoId: string, padreId: string | null) {
    if (cronologiaAperta === preventivoId) { setCronologiaAperta(null); return }
    if (!padreId) return
    const versioni = await caricaCronologiaPreventivo(padreId)
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
        {preventiviVisibili.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Nessun preventivo salvato.</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(tabs)/nuovo')}>
              <Text style={styles.emptyBtnText}>Genera il primo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          preventiviVisibili.map(p => {
            const selezionato = preventiviSelezionati.includes(p.id)
            return (
            <View key={p.id} style={[styles.card, selezionato && styles.cardSelected]}>
              <View style={styles.cardRowContainer}>
  {/* Tap su card: apre cartella cliente o espande dettaglio */}
  <TouchableOpacity style={[styles.cardRow, { flex: 1 }]} onLongPress={() => avviaSelezione(p.id)} onPress={() => {
    if (selezioneAttiva) {
      toggleSelezione(p.id)
      return
    }
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
    <TouchableOpacity style={{ alignItems: 'flex-end' }} onPress={() => selezioneAttiva ? toggleSelezione(p.id) : setModalStato(p.id)}>
      <Text style={styles.cardImporto}>{p.importo_totale ? `€${p.importo_totale}` : '—'}</Text>
      <Text style={[styles.cardStato,
        p.stato === 'accettato' ? { color: '#0E9F8E' } :
        p.stato === 'rifiutato' ? { color: '#EF4444' } :
        p.stato === 'inviato' ? { color: '#1D4ED8' } : {}
      ]}>{`${p.stato || 'bozza'} ▼`}</Text>
    </TouchableOpacity>
    <TouchableOpacity onPress={() => selezioneAttiva ? toggleSelezione(p.id) : scaricaPDF(p)}>
      <Text style={{ fontSize: 16 }}>{p.pdf_url ? '📄' : '🔄'}</Text>
    </TouchableOpacity>
    <TouchableOpacity onPress={() => selezioneAttiva ? toggleSelezione(p.id) : elimina(p.id)}>
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
                              await ripristinaVersionePreventivo(p.id, v.id)
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
            )
          })
        )}
        <View style={{ height: selezioneAttiva ? 120 : 40 }} />
      </ScrollView>

      {selezioneAttiva && (
        <View style={styles.selectionBar}>
          <View style={styles.selectionTopRow}>
            <Text style={styles.selectionCount}>{preventiviSelezionati.length} selezionati</Text>
            <TouchableOpacity onPress={annullaSelezione}>
              <Text style={styles.selectionCancel}>✕ Annulla</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.selectionActions}>
            <TouchableOpacity style={styles.selectionActionBtn} onPress={eliminaSelezionati}>
              <Text style={styles.selectionActionText}>🗑 Elimina</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.selectionActionBtn} onPress={() => setModalStatoMultiplo(true)}>
              <Text style={styles.selectionActionText}>🔄 Cambia stato</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.selectionActionBtn} onPress={condividiSelezionati}>
              <Text style={styles.selectionActionText}>📤 Condividi</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.selectionActionBtn} onPress={apriSpostaCliente}>
              <Text style={styles.selectionActionText}>📁 Sposta</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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

      <Modal visible={modalStatoMultiplo} transparent animationType="fade" onRequestClose={() => setModalStatoMultiplo(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalStatoMultiplo(false)}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Cambia stato</Text>
            {['bozza', 'inviato', 'accettato', 'rifiutato'].map(s => (
              <TouchableOpacity key={s} style={styles.modalOption} onPress={() => cambiaStatoSelezionati(s)}>
                <Text style={styles.modalOptionIcon}>{s === 'bozza' ? 'ðŸ“' : s === 'inviato' ? 'ðŸ“¤' : s === 'accettato' ? 'âœ…' : 'âŒ'}</Text>
                <Text style={styles.modalOptionText}>{s}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCancel} onPress={() => setModalStatoMultiplo(false)}>
              <Text style={styles.modalCancelText}>Annulla</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={modalClienti} transparent animationType="slide" onRequestClose={() => setModalClienti(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Sposta cliente</Text>
            {caricandoClienti ? (
              <ActivityIndicator color="#0E9F8E" />
            ) : clienti.length === 0 ? (
              <Text style={styles.emptyText}>Nessun cliente disponibile.</Text>
            ) : (
              clienti.map(cliente => (
                <TouchableOpacity key={cliente.id} style={styles.modalOption} onPress={() => spostaSelezionati(cliente)}>
                  <Text style={styles.modalOptionText}>{cliente.nome}</Text>
                </TouchableOpacity>
              ))
            )}
            <TouchableOpacity style={styles.modalCancel} onPress={() => setModalClienti(false)}>
              <Text style={styles.modalCancelText}>Annulla</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  cardSelected: { borderColor: '#0E9F8E', backgroundColor: '#F0FDF4' },
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
  selectionBar: { position: 'absolute', left: 12, right: 12, bottom: 12, backgroundColor: '#0D1B2A', borderRadius: 16, padding: 12, gap: 10 },
  selectionTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectionCount: { color: '#fff', fontSize: 14, fontWeight: '600' },
  selectionCancel: { color: '#9EC5C0', fontSize: 13, fontWeight: '600' },
  selectionActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectionActionBtn: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9 },
  selectionActionText: { color: '#fff', fontSize: 12, fontWeight: '600' },
})
