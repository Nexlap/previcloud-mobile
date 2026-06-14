import * as FileSystem from 'expo-file-system/legacy'
import { router, useLocalSearchParams, useNavigation } from 'expo-router'
import * as Sharing from 'expo-sharing'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator, Alert, BackHandler,
  Linking,
  Modal,
  RefreshControl, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View
} from 'react-native'
import { creaLinkPagamentoRata } from '../../lib/api/pdf'
import { eventBus } from '../../lib/eventBus'
import { RataAbbonamento, useAbbonamento } from '../../lib/hooks/useAbbonamento'
import { usePreventivi } from '../../lib/hooks/usePreventivi'
import { supabase } from '../../lib/supabase'
import { Cliente, Preventivo, Trascrizione } from '../../lib/types'

const MESI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']

export default function ClienteDettaglio() {
  const { id, nome } = useLocalSearchParams<{ id: string, nome: string }>()
  const navigation = useNavigation()

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [trascrizioni, setTrascrizioni] = useState<Trascrizione[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tab, setTab] = useState<'preventivi' | 'chiamate' | 'abbonamento'>('preventivi')
  const [aperto, setAperto] = useState<string | null>(null)
  const [modalStato, setModalStato] = useState<string | null>(null)
  const [cronologiaAperta, setCronologiaAperta] = useState<string | null>(null)
  const [cronologia, setCronologia] = useState<{ [key: string]: Preventivo[] }>({})
  const [cronologiaVersioneAperta, setCronologiaVersioneAperta] = useState<string | null>(null)
  const [mostraModalSposta, setMostraModalSposta] = useState<string | null>(null)
  const [clientiDisponibili, setClientiDisponibili] = useState<{ id: string, nome: string }[]>([])
  const [mostraModalRinomina, setMostraModalRinomina] = useState<string | null>(null)
  const [nuovoTitolo, setNuovoTitolo] = useState('')
  const [mostraModalRinominaCliente, setMostraModalRinominaCliente] = useState(false)
  const [nuovoNomeCliente, setNuovoNomeCliente] = useState('')
  const [nuovoTelefono, setNuovoTelefono] = useState('')
  const [nuovaEmail, setNuovaEmail] = useState('')
  const [nuovoIndirizzo, setNuovoIndirizzo] = useState('')
  const [nuoveNote, setNuoveNote] = useState('')
  const [selezione, setSelezione] = useState<string[]>([])
  const [modalitaSelezione, setModalitaSelezione] = useState(false)
  const [modificheNonSalvate, setModificheNonSalvate] = useState(false)

  // Abbonamento
  const [mostraModalNuovoAb, setMostraModalNuovoAb] = useState(false)
  const [mostraModalModificaAb, setMostraModalModificaAb] = useState(false)
  const [abImporto, setAbImporto] = useState('')
  const [abGiorno, setAbGiorno] = useState('1')
  const [abMensilita, setAbMensilita] = useState('')
  const [rataSelezionata, setRataSelezionata] = useState<RataAbbonamento | null>(null)
  const [pagamentoImporto, setPagamentoImporto] = useState('')
  const [pagamentoNota, setPagamentoNota] = useState('')
  const [invioReminderLoading, setInvioReminderLoading] = useState<string | null>(null)

  const {
    preventivi, totaleValore,
    cambiaStato, eliminaPreventivo: eliminaPrev, rinominaPreventivo, spostaPreventivo,
    onRefresh: onRefreshPreventivi
  } = usePreventivi({ clienteId: id })

  const {
    abbonamento, rate, loading: loadingAb,
    creaAbbonamento, aggiornaAbbonamento, eliminaAbbonamento,
    registraPagamento, azzeraPagamento,
    aggiungiRataMese,
    totaleIncassato, totaleParziale, carica: caricaAb
  } = useAbbonamento(id)

  useEffect(() => { carica() }, [])

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (!modificheNonSalvate || !mostraModalRinominaCliente) return
      e.preventDefault()
      Alert.alert('Modifiche non salvate', 'Vuoi salvare le modifiche al cliente?', [
        { text: 'Abbandona', style: 'destructive', onPress: () => { setMostraModalRinominaCliente(false); setModificheNonSalvate(false); navigation.dispatch(e.data.action) } },
        { text: 'Continua', style: 'cancel' },
        { text: 'Salva', onPress: async () => { await salvaCliente(); navigation.dispatch(e.data.action) } }
      ])
    })
    return unsubscribe
  }, [modificheNonSalvate, mostraModalRinominaCliente, navigation])

  useEffect(() => {
    if (!mostraModalRinominaCliente) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (modificheNonSalvate) {
        Alert.alert('Modifiche non salvate', 'Vuoi salvare le modifiche al cliente?', [
          { text: 'Abbandona', style: 'destructive', onPress: () => { setMostraModalRinominaCliente(false); setModificheNonSalvate(false) } },
          { text: 'Continua', style: 'cancel' },
          { text: 'Salva', onPress: salvaCliente }
        ])
        return true
      }
      return false
    })
    return () => sub.remove()
  }, [mostraModalRinominaCliente, modificheNonSalvate])

  async function carica() {
    const [{ data: cl }, { data: trascr }] = await Promise.all([
      supabase.from('clienti').select('*').eq('id', id).single(),
      supabase.from('trascrizioni').select('*').eq('cliente_id', id).order('created_at', { ascending: false })
    ])
    if (cl) setCliente(cl as Cliente)
    if (trascr) setTrascrizioni(trascr as Trascrizione[])
    setLoading(false)
  }

  async function onRefresh() {
    setRefreshing(true)
    await Promise.all([carica(), onRefreshPreventivi(), caricaAb()])
    setRefreshing(false)
  }

  async function eliminaPreventivo(prevId: string) {
    Alert.alert('Elimina', 'Vuoi eliminare questo preventivo?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: () => eliminaPrev(prevId) }
    ])
  }

  async function eliminaCliente() {
    Alert.alert('Elimina cliente', 'Vuoi eliminare questo cliente?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: async () => {
        await supabase.from('clienti').delete().eq('id', id)
        router.back()
      }}
    ])
  }

  async function salvaCliente() {
    if (!nuovoNomeCliente.trim()) return
    const aggiornamento = {
      nome: nuovoNomeCliente.trim(),
      telefono: nuovoTelefono.trim() || null,
      email: nuovaEmail.trim() || null,
      indirizzo: nuovoIndirizzo.trim() || null,
      note: nuoveNote.trim() || null,
    }
    await supabase.from('clienti').update(aggiornamento).eq('id', id)
    setCliente(c => c ? { ...c, ...aggiornamento } : c)
    setMostraModalRinominaCliente(false)
    setModificheNonSalvate(false)
  }

  async function caricaClientiDisponibili() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('clienti').select('id, nome').eq('user_id', user.id).neq('id', id).order('nome')
    if (data) setClientiDisponibili(data)
  }

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

  function toggleSelezione(prevId: string) {
    setSelezione(s => {
      if (s.includes(prevId)) {
        const nuova = s.filter(x => x !== prevId)
        if (nuova.length === 0) setModalitaSelezione(false)
        return nuova
      }
      return [...s, prevId]
    })
  }

  function iniziaSelezione(prevId: string) {
    setModalitaSelezione(true)
    setSelezione([prevId])
    setAperto(null)
  }

  function annullaSelezione() {
    setModalitaSelezione(false)
    setSelezione([])
  }

  async function eliminaSelezionati() {
    Alert.alert('Elimina', `Vuoi eliminare ${selezione.length} preventivi?`, [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: async () => {
        await Promise.all(selezione.map(sid => supabase.from('preventivi').delete().eq('id', sid)))
        annullaSelezione()
      }}
    ])
  }

  async function spostaSelezionati(nuovoClienteId: string, nuovoClienteNome: string) {
    await Promise.all(selezione.map(sid =>
      supabase.from('preventivi').update({ cliente_id: nuovoClienteId, nome_cliente: nuovoClienteNome }).eq('id', sid)
    ))
    annullaSelezione()
    setMostraModalSposta(null)
    Alert.alert('✓ Spostati', `${selezione.length} preventivi spostati a ${nuovoClienteNome}`)
  }

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

  function formatDurata(sec: number | null) {
    if (!sec) return '—'
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  function statoRataColore(stato: string) {
    if (stato === 'incassato') return '#0E9F8E'
    if (stato === 'in_ritardo') return '#EF4444'
    if (stato === 'parziale') return '#F59E0B'
    return '#9CA3AF'
  }

  function statoRataLabel(stato: string) {
    if (stato === 'incassato') return '✅ Incassato'
    if (stato === 'in_ritardo') return '⚠️ In ritardo'
    if (stato === 'parziale') return '🔸 Parziale'
    return '⏳ Da incassare'
  }

  function apriModalPagamento(rata: RataAbbonamento) {
    setRataSelezionata(rata)
    // precompila con il residuo da pagare
    const residuo = rata.importo - (rata.acconto || 0)
    setPagamentoImporto(residuo.toString())
    setPagamentoNota('')
  }
  async function inviaReminder(rata: RataAbbonamento) {
    try {
      setInvioReminderLoading(rata.id)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const residuo = rata.importo - (rata.acconto || 0)
      const link = await creaLinkPagamentoRata(rata.id, cliente?.nome || '', session.access_token)
      const MESI_FULL = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
      const testo = `Ciao ${cliente?.nome || ''}, ti ricordo il pagamento di €${residuo} per il canone di ${MESI_FULL[rata.mese - 1]} ${rata.anno}. Puoi pagare qui: ${link}`
      const url = `whatsapp://send?text=${encodeURIComponent(testo)}${cliente?.telefono ? `&phone=${cliente.telefono.replace(/\s/g, '')}` : ''}`
      const supportato = await Linking.canOpenURL(url)
      if (supportato) {
        await Linking.openURL(url)
      } else {
        Alert.alert('WhatsApp non disponibile', 'Copia il link e invialo manualmente', [
          { text: 'Copia link', onPress: () => Alert.alert('Link', link) },
          { text: 'OK' }
        ])
      }
    } catch (err: any) {
      Alert.alert('Errore', err.message)
    } finally {
      setInvioReminderLoading(null)
    }
  }
  
  const ora = new Date()
  const meseCorrente = ora.getMonth() + 1
  const annoCorrente = ora.getFullYear()

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#0E9F8E" /></View>
  if (!cliente) return <View style={styles.center}><ActivityIndicator size="large" color="#0E9F8E" /></View>

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{cliente.nome || nome}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => {
            setNuovoNomeCliente(cliente.nome || '')
            setNuovoTelefono(cliente.telefono || '')
            setNuovaEmail(cliente.email || '')
            setNuovoIndirizzo(cliente.indirizzo || '')
            setNuoveNote(cliente.note || '')
            setModificheNonSalvate(false)
            setMostraModalRinominaCliente(true)
          }}>
            <Text style={styles.headerActionText}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={eliminaCliente}>
            <Text style={styles.headerActionText}>🗑</Text>
          </TouchableOpacity>
        </View>
      </View>

      {modalitaSelezione && (
        <View style={styles.selectionBar}>
          <TouchableOpacity onPress={annullaSelezione} style={styles.selectionCancel}>
            <Text style={styles.selectionCancelText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.selectionCount}>{selezione.length} selezionati</Text>
          <View style={styles.selectionActions}>
            <TouchableOpacity style={styles.selectionAction} onPress={async () => { await caricaClientiDisponibili(); setMostraModalSposta('multi') }}>
              <Text style={styles.selectionActionText}>↗ Sposta</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.selectionAction, styles.selectionActionDelete]} onPress={eliminaSelezionati}>
              <Text style={[styles.selectionActionText, { color: '#EF4444' }]}>🗑 Elimina</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0E9F8E" colors={["#0E9F8E"]} />}
      >
        {/* Info cliente */}
        <View style={styles.card}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(cliente.nome || 'C').charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.avatarInfo}>
              <Text style={styles.clienteNome}>{cliente.nome || ''}</Text>
              {cliente.telefono && <Text style={styles.clienteInfo}>📞 {cliente.telefono}</Text>}
              {cliente.email && <Text style={styles.clienteInfo}>✉️ {cliente.email}</Text>}
              {cliente.indirizzo && <Text style={styles.clienteInfo}>📍 {cliente.indirizzo}</Text>}
              {cliente.note && <Text style={styles.clienteNote}>{cliente.note}</Text>}
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
            <Text style={[styles.statVal, { color: '#0E9F8E' }]}>{`€${totaleValore.toFixed(0)}`}</Text>
            <Text style={styles.statLabel}>Fatturato</Text>
          </View>
          {abbonamento ? (
            <View style={styles.statCard}>
              <Text style={[styles.statVal, { color: '#0E9F8E' }]}>{`€${(totaleIncassato + totaleParziale).toFixed(0)}`}</Text>
              <Text style={styles.statLabel}>Abbonamento</Text>
            </View>
          ) : (
            <View style={styles.statCard}>
              <Text style={styles.statVal}>{trascrizioni.length}</Text>
              <Text style={styles.statLabel}>Chiamate</Text>
            </View>
          )}
        </View>

        {/* Tab */}
        <View style={styles.tabs}>
          <TouchableOpacity style={[styles.tabBtn, tab === 'preventivi' && styles.tabBtnActive]} onPress={() => setTab('preventivi')}>
            <Text style={[styles.tabText, tab === 'preventivi' && styles.tabTextActive]}>Preventivi</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, tab === 'chiamate' && styles.tabBtnActive]} onPress={() => setTab('chiamate')}>
            <Text style={[styles.tabText, tab === 'chiamate' && styles.tabTextActive]}>Chiamate</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, tab === 'abbonamento' && styles.tabBtnActive]} onPress={() => setTab('abbonamento')}>
            <Text style={[styles.tabText, tab === 'abbonamento' && styles.tabTextActive]}>💰 Abbonamento</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Preventivi */}
        {tab === 'preventivi' && (
          preventivi.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Nessun preventivo per questo cliente</Text>
            </View>
          ) : (
            preventivi.map(p => (
              <TouchableOpacity
                key={p.id}
                style={[styles.prevCard, !p.is_ultimo && styles.prevCardOld, selezione.includes(p.id) && styles.prevCardSelected]}
                onPress={() => { if (modalitaSelezione) toggleSelezione(p.id); else setAperto(aperto === p.id ? null : p.id) }}
                onLongPress={() => iniziaSelezione(p.id)}
              >
                <View style={styles.prevRow}>
                  {modalitaSelezione && (
                    <View style={[styles.checkCircle, selezione.includes(p.id) && styles.checkCircleActive]}>
                      {selezione.includes(p.id) && <Text style={styles.checkMark}>✓</Text>}
                    </View>
                  )}
                  <View style={styles.prevLeft}>
                    <Text style={styles.prevVersione}>{p.titolo || `v${p.versione || 1}`}</Text>
                    <Text style={styles.prevData}>
                      {`${new Date(p.created_at).toLocaleDateString('it-IT')}${p.is_ultimo ? ' · attivo' : ''}`}
                    </Text>
                  </View>
                  <View style={[styles.prevRightRow, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
                    <TouchableOpacity style={styles.prevRight} onPress={() => setModalStato(p.id)}>
                      <Text style={styles.prevImporto}>{p.importo_totale ? `€${p.importo_totale}` : '—'}</Text>
                      <Text style={[styles.prevStato,
                        p.stato === 'accettato' ? { color: '#0E9F8E' } :
                        p.stato === 'rifiutato' ? { color: '#EF4444' } :
                        p.stato === 'inviato' ? { color: '#1D4ED8' } : {}
                      ]}>{`${p.stato || 'bozza'} ▼`}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => scaricaPDF(p)}>
                      <Text style={{ fontSize: 16 }}>{p.pdf_url ? '📄' : '🔄'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => eliminaPreventivo(p.id)}>
                      <Text style={{ fontSize: 16 }}>🗑</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {aperto === p.id && p.testo_preventivo && (
                  <View style={styles.prevDetail}>
                    <Text style={styles.prevTesto}>{p.testo_preventivo}</Text>
                    {p.versione && p.versione > 1 && (
                      <TouchableOpacity style={styles.cronologiaBtn} onPress={() => caricaCronologia(p.id, p.preventivo_padre_id)}>
                        <Text style={styles.cronologiaBtnText}>
                          {cronologiaAperta === p.id ? '▲ Nascondi cronologia' : `▼ Mostra cronologia (${p.versione - 1} vers. precedenti)`}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {cronologiaAperta === p.id && cronologia[p.id]?.map(v => (
                      <View key={v.id}>
                        <TouchableOpacity style={styles.cronologiaItem} onPress={() => setCronologiaVersioneAperta(cronologiaVersioneAperta === v.id ? null : v.id)}>
                          <Text style={styles.cronologiaVer}>v{v.versione || 1}</Text>
                          <Text style={styles.cronologiaData}>{new Date(v.created_at).toLocaleDateString('it-IT')}</Text>
                          <Text style={styles.cronologiaImporto}>{v.importo_totale ? `€${v.importo_totale}` : '—'}</Text>
                        </TouchableOpacity>
                        {cronologiaVersioneAperta === v.id && (
                          <View style={styles.cronologiaDetail}>
                            <Text style={styles.prevTesto}>{v.testo_preventivo}</Text>
                            <TouchableOpacity style={styles.ripristinaBtn} onPress={() => router.push({
                              pathname: '/(tabs)/nuovo',
                              params: { testo_modifica: v.testo_preventivo || '', versione_padre_id: p.id, versione_numero: String((p.versione || 1) + 1) }
                            })}>
                              <Text style={styles.ripristinaBtnText}>✏️ Modifica e genera nuova versione</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    ))}
                    {p.is_ultimo && (
                      <TouchableOpacity style={styles.editBtn} onPress={() => router.push({
                        pathname: '/(tabs)/nuovo',
                        params: { testo_modifica: p.testo_preventivo || '', versione_padre_id: p.id, versione_numero: String((p.versione || 1) + 1) }
                      })}>
                        <Text style={styles.editBtnText}>{`✏️ Modifica e genera v${(p.versione || 1) + 1}`}</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.spostaBtn} onPress={async () => { await caricaClientiDisponibili(); setMostraModalSposta(p.id) }}>
                      <Text style={styles.postaBtnText}>↗ Sposta ad altro cliente</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.spostaBtn} onPress={() => { setNuovoTitolo(p.titolo || ''); setMostraModalRinomina(p.id) }}>
                      <Text style={styles.postaBtnText}>✏️ Rinomina preventivo</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )
        )}

        {/* Tab Chiamate */}
        {tab === 'chiamate' && (
          trascrizioni.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Nessuna chiamata registrata</Text>
            </View>
          ) : (
            trascrizioni.map(t => (
              <TouchableOpacity key={t.id} style={styles.chiamataCard} onPress={() => setAperto(aperto === t.id ? null : t.id)}>
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
                    <TouchableOpacity style={styles.editBtn} onPress={() => router.push({ pathname: '/(tabs)/nuovo', params: { trascrizione: t.testo } })}>
                      <Text style={styles.editBtnText}>💬 Genera preventivo da questa chiamata</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )
        )}

        {/* Tab Abbonamento */}
        {tab === 'abbonamento' && (
          loadingAb ? (
            <ActivityIndicator color="#0E9F8E" style={{ marginTop: 40 }} />
          ) : !abbonamento ? (
            <View style={styles.abEmpty}>
              <Text style={styles.abEmptyIcon}>💰</Text>
              <Text style={styles.abEmptyTitle}>Nessun abbonamento</Text>
              <Text style={styles.abEmptyText}>Configura un canone mensile ricorrente per questo cliente</Text>
              <TouchableOpacity style={styles.abCreaBtn} onPress={() => {
                setAbImporto('')
                setAbGiorno('1')
                setAbMensilita('')
                setMostraModalNuovoAb(true)
              }}>
                <Text style={styles.abCreaBtnText}>+ Configura abbonamento</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Card intestazione abbonamento */}
              <View style={styles.abCard}>
                <View style={styles.abCardRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.abCardLabel}>{abbonamento.tipo === 'rate' ? 'PAGAMENTO A RATE' : 'CANONE MENSILE'}</Text>
                    <Text style={styles.abCardImporto}>€{abbonamento.importo_default}/mese</Text>
                    <Text style={styles.abCardGiorno}>Scadenza il giorno {abbonamento.giorno_scadenza}</Text>
                    {abbonamento.numero_mensilita && (
                      <Text style={styles.abCardGiorno}>{abbonamento.numero_mensilita} mensilità totali</Text>
                    )}
                  </View>
                  <View style={{ gap: 12, alignItems: 'flex-end' }}>
                    <TouchableOpacity onPress={() => {
                      setAbImporto(abbonamento.importo_default.toString())
                      setAbGiorno(abbonamento.giorno_scadenza.toString())
                      setMostraModalModificaAb(true)
                    }}>
                      <Text style={{ fontSize: 18 }}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => {
                      Alert.alert(
                        'Elimina abbonamento',
                        'Le rate storiche resteranno salvate. Vuoi procedere?',
                        [
                          { text: 'Annulla', style: 'cancel' },
                          { text: 'Elimina', style: 'destructive', onPress: eliminaAbbonamento }
                        ]
                      )
                    }}>
                      <Text style={{ fontSize: 18 }}>🗑</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Rate */}
              {rate.map(r => {
                const isMeseCorrente = r.mese === meseCorrente && r.anno === annoCorrente
                const acconto = r.acconto || 0
                const residuo = r.importo - acconto

                return (
                  <View key={r.id} style={[styles.rataCard, isMeseCorrente && styles.rataCardCorrente]}>
                    <View style={styles.rataRow}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={styles.rataMese}>{MESI[r.mese - 1]} {r.anno}</Text>
                          {isMeseCorrente && <Text style={styles.rataMeseTag}>corrente</Text>}
                        </View>
                        {r.note ? <Text style={styles.rataNota}>{r.note}</Text> : null}
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 2 }}>
                        <Text style={styles.rataImporto}>€{r.importo}</Text>
                        <Text style={[styles.rataStato, { color: statoRataColore(r.stato) }]}>
                          {statoRataLabel(r.stato)}
                        </Text>
                      </View>
                    </View>

                    {/* Barra acconto/residuo se parziale */}
                    {r.stato === 'parziale' && (
                      <View style={styles.rataBarraContainer}>
                        <View style={styles.rataBarra}>
                          <View style={[styles.rataBarraFill, { width: `${(acconto / r.importo) * 100}%` as any }]} />
                        </View>
                        <View style={styles.rataBarraLabels}>
                          <Text style={styles.rataBarraAcconto}>Acconto: €{acconto}</Text>
                          <Text style={styles.rataBarraResiduo}>Residuo: €{residuo}</Text>
                        </View>
                      </View>
                    )}

                    {/* Azioni rata */}
                    <View style={styles.rataAzioni}>
                      {r.stato !== 'incassato' && (
                        <TouchableOpacity
                          style={styles.rataAzioneBtn}
                          onPress={() => apriModalPagamento(r)}
                        >
                          <Text style={styles.rataAzioneBtnText}>+ Registra pagamento</Text>
                        </TouchableOpacity>
                      )}
                      {r.stato !== 'incassato' && (
  <TouchableOpacity
    style={[styles.rataAzioneBtn, { borderColor: '#25D366', flex: 0, paddingHorizontal: 12 }]}
    onPress={() => inviaReminder(r)}
    disabled={invioReminderLoading === r.id}
  >
    {invioReminderLoading === r.id
      ? <ActivityIndicator size="small" color="#25D366" />
      : <Text style={[styles.rataAzioneBtnText, { color: '#25D366' }]}>📤 WhatsApp</Text>
    }
  </TouchableOpacity>
)}
                    </View>
                  </View>
                )
              })}

              {/* Aggiungi rata mese precedente */}
              <TouchableOpacity style={styles.abAggiungiBtn} onPress={() => {
                const mPrec = meseCorrente === 1 ? 12 : meseCorrente - 1
                const aPrec = meseCorrente === 1 ? annoCorrente - 1 : annoCorrente
                aggiungiRataMese(mPrec, aPrec, abbonamento.importo_default)
              }}>
                <Text style={styles.abAggiungiText}>+ Aggiungi mese precedente</Text>
              </TouchableOpacity>

              {/* Aggiungi rata mese corrente se mancante */}
              {!rate.find(r => r.mese === meseCorrente && r.anno === annoCorrente) && (
                <TouchableOpacity style={styles.abAggiungiBtn} onPress={() => aggiungiRataMese(meseCorrente, annoCorrente, abbonamento.importo_default)}>
                  <Text style={styles.abAggiungiText}>+ Aggiungi {MESI[meseCorrente - 1]} {annoCorrente}</Text>
                </TouchableOpacity>
              )}
            </>
          )
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Bottone nuovo preventivo */}
      <TouchableOpacity
        style={styles.nuovoBtn}
        onPress={() => router.push({ pathname: '/(tabs)/nuovo', params: { cliente_id: id, cliente_nome: cliente.nome || nome } })}
      >
        <Text style={styles.nuovoBtnText}>+ Nuovo preventivo</Text>
      </TouchableOpacity>

      {/* Modal cambia stato preventivo */}
      <Modal visible={modalStato !== null} transparent animationType="fade" onRequestClose={() => setModalStato(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalStato(null)}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Cambia stato</Text>
            {['bozza', 'inviato', 'accettato', 'rifiutato'].map(s => (
              <TouchableOpacity key={s} style={styles.modalOption} onPress={() => { if (modalStato) { cambiaStato(modalStato, s); eventBus.emit('aggiorna-home') } setModalStato(null) }}>
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

      {/* Modal sposta preventivo */}
      <Modal visible={mostraModalSposta !== null} transparent animationType="fade" onRequestClose={() => setMostraModalSposta(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMostraModalSposta(null)}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Sposta a quale cliente?</Text>
            {clientiDisponibili.length === 0 ? (
              <Text style={{ textAlign: 'center', color: '#9CA3AF', padding: 20 }}>Nessun altro cliente disponibile</Text>
            ) : (
              clientiDisponibili.map(c => (
                <TouchableOpacity key={c.id} style={styles.modalOption} onPress={() => {
                  if (mostraModalSposta === 'multi') spostaSelezionati(c.id, c.nome)
                  else if (mostraModalSposta) spostaPreventivo(mostraModalSposta, c.id, c.nome)
                  setMostraModalSposta(null)
                }}>
                  <Text style={styles.modalOptionIcon}>👤</Text>
                  <Text style={styles.modalOptionText}>{c.nome}</Text>
                </TouchableOpacity>
              ))
            )}
            <TouchableOpacity style={styles.modalCancel} onPress={() => setMostraModalSposta(null)}>
              <Text style={styles.modalCancelText}>Annulla</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal rinomina preventivo */}
      <Modal visible={mostraModalRinomina !== null} transparent animationType="fade" onRequestClose={() => setMostraModalRinomina(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMostraModalRinomina(null)}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Rinomina preventivo</Text>
            <TextInput style={styles.modalInput} value={nuovoTitolo} onChangeText={setNuovoTitolo} placeholder="es. Preventivo caldaia" placeholderTextColor="#9CA3AF" autoFocus />
            <TouchableOpacity style={styles.modalSaveBtn} onPress={() => { if (mostraModalRinomina) rinominaPreventivo(mostraModalRinomina, nuovoTitolo); setMostraModalRinomina(null) }}>
              <Text style={styles.modalSaveBtnText}>Salva</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setMostraModalRinomina(null)}>
              <Text style={styles.modalCancelText}>Annulla</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal nuovo abbonamento */}
      <Modal visible={mostraModalNuovoAb} transparent animationType="fade" onRequestClose={() => setMostraModalNuovoAb(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMostraModalNuovoAb(false)}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Nuovo abbonamento</Text>
            <Text style={styles.modalFieldLabel}>IMPORTO MENSILE (€)</Text>
            <TextInput
              style={[styles.modalInput, { marginTop: 6 }]}
              value={abImporto}
              onChangeText={setAbImporto}
              placeholder="es. 500"
              placeholderTextColor="#9CA3AF"
              keyboardType="decimal-pad"
              autoFocus
            />
            <Text style={[styles.modalFieldLabel, { marginTop: 8 }]}>GIORNO SCADENZA</Text>
            <TextInput
              style={[styles.modalInput, { marginTop: 6 }]}
              value={abGiorno}
              onChangeText={setAbGiorno}
              placeholder="es. 15"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
            />
            <Text style={[styles.modalFieldLabel, { marginTop: 8 }]}>N° MENSILITÀ (opzionale)</Text>
            <TextInput
              style={[styles.modalInput, { marginTop: 6 }]}
              value={abMensilita}
              onChangeText={setAbMensilita}
              placeholder="es. 12 — lascia vuoto per canone aperto"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
            />
            <TouchableOpacity style={styles.modalSaveBtn} onPress={async () => {
              const importo = parseFloat(abImporto.replace(',', '.'))
              const giorno = parseInt(abGiorno)
              if (!importo || importo <= 0) { Alert.alert('Inserisci un importo valido'); return }
              if (!giorno || giorno < 1 || giorno > 31) { Alert.alert('Inserisci un giorno valido (1-31)'); return }
              const mensilita = abMensilita ? parseInt(abMensilita) : undefined
              const tipo = mensilita ? 'rate' : 'canone'
              await creaAbbonamento(importo, giorno, { numeroMensilita: mensilita, tipo })
              setMostraModalNuovoAb(false)
            }}>
              <Text style={styles.modalSaveBtnText}>Crea abbonamento</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setMostraModalNuovoAb(false)}>
              <Text style={styles.modalCancelText}>Annulla</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal modifica abbonamento */}
      <Modal visible={mostraModalModificaAb} transparent animationType="fade" onRequestClose={() => setMostraModalModificaAb(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMostraModalModificaAb(false)}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Modifica abbonamento</Text>
            <Text style={styles.modalFieldLabel}>IMPORTO MENSILE (€)</Text>
            <TextInput
              style={[styles.modalInput, { marginTop: 6 }]}
              value={abImporto}
              onChangeText={setAbImporto}
              keyboardType="decimal-pad"
              autoFocus
            />
            <Text style={[styles.modalFieldLabel, { marginTop: 8 }]}>GIORNO SCADENZA</Text>
            <TextInput
              style={[styles.modalInput, { marginTop: 6 }]}
              value={abGiorno}
              onChangeText={setAbGiorno}
              keyboardType="number-pad"
            />
            <TouchableOpacity style={styles.modalSaveBtn} onPress={async () => {
              const importo = parseFloat(abImporto.replace(',', '.'))
              const giorno = parseInt(abGiorno)
              if (!importo || importo <= 0) { Alert.alert('Inserisci un importo valido'); return }
              await aggiornaAbbonamento(importo, giorno)
              setMostraModalModificaAb(false)
            }}>
              <Text style={styles.modalSaveBtnText}>Salva</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setMostraModalModificaAb(false)}>
              <Text style={styles.modalCancelText}>Annulla</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal registra pagamento rata */}
      <Modal visible={rataSelezionata !== null} transparent animationType="fade" onRequestClose={() => setRataSelezionata(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setRataSelezionata(null)}>
          <View style={styles.modalBox}>
            {rataSelezionata && (
              <>
                <Text style={styles.modalTitle}>
                  {MESI[rataSelezionata.mese - 1]} {rataSelezionata.anno}
                </Text>

                {/* Riepilogo stato attuale */}
                <View style={styles.modalRiepilogo}>
                  <View style={styles.modalRiepilogoRow}>
                    <Text style={styles.modalRiepilogoLabel}>Totale</Text>
                    <Text style={styles.modalRiepilogoVal}>€{rataSelezionata.importo}</Text>
                  </View>
                  {(rataSelezionata.acconto || 0) > 0 && (
                    <View style={styles.modalRiepilogoRow}>
                      <Text style={styles.modalRiepilogoLabel}>Già incassato</Text>
                      <Text style={[styles.modalRiepilogoVal, { color: '#0E9F8E' }]}>€{rataSelezionata.acconto}</Text>
                    </View>
                  )}
                  <View style={styles.modalRiepilogoRow}>
                    <Text style={styles.modalRiepilogoLabel}>Residuo</Text>
                    <Text style={[styles.modalRiepilogoVal, { color: '#EF4444' }]}>
                      €{rataSelezionata.importo - (rataSelezionata.acconto || 0)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.modalFieldLabel}>IMPORTO RICEVUTO ORA (€)</Text>
                <TextInput
                  style={[styles.modalInput, { marginTop: 6 }]}
                  value={pagamentoImporto}
                  onChangeText={setPagamentoImporto}
                  keyboardType="decimal-pad"
                  autoFocus
                />
                <Text style={[styles.modalFieldLabel, { marginTop: 8 }]}>NOTA (opzionale)</Text>
                <TextInput
                  style={[styles.modalInput, { marginTop: 6 }]}
                  value={pagamentoNota}
                  onChangeText={setPagamentoNota}
                  placeholder="es. Bonifico 10 giugno"
                  placeholderTextColor="#9CA3AF"
                />

                <TouchableOpacity
                  style={[styles.modalSaveBtn, { backgroundColor: '#0E9F8E' }]}
                  onPress={async () => {
                    const importo = parseFloat(pagamentoImporto.replace(',', '.'))
                    if (!importo || importo <= 0) { Alert.alert('Inserisci un importo valido'); return }
                    await registraPagamento(rataSelezionata.id, importo, pagamentoNota || undefined)
                    setRataSelezionata(null)
                  }}
                >
                  <Text style={styles.modalSaveBtnText}>✓ Registra pagamento</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalCancel} onPress={() => setRataSelezionata(null)}>
                  <Text style={styles.modalCancelText}>Annulla</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal modifica cliente */}
      <Modal visible={mostraModalRinominaCliente} transparent animationType="slide" onRequestClose={() => {
        if (modificheNonSalvate) {
          Alert.alert('Modifiche non salvate', 'Vuoi salvare le modifiche al cliente?', [
            { text: 'Abbandona', style: 'destructive', onPress: () => { setMostraModalRinominaCliente(false); setModificheNonSalvate(false) } },
            { text: 'Continua', style: 'cancel' },
            { text: 'Salva', onPress: salvaCliente }
          ])
        } else {
          setMostraModalRinominaCliente(false)
        }
      }}>
        <View style={styles.modalFullContainer}>
          <View style={styles.modalFullHeader}>
            <TouchableOpacity onPress={() => {
              if (modificheNonSalvate) {
                Alert.alert('Modifiche non salvate', 'Vuoi salvare le modifiche?', [
                  { text: 'Abbandona', style: 'destructive', onPress: () => { setMostraModalRinominaCliente(false); setModificheNonSalvate(false) } },
                  { text: 'Salva', onPress: salvaCliente }
                ])
              } else {
                setMostraModalRinominaCliente(false)
              }
            }}>
              <Text style={styles.modalFullClose}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalFullTitle}>Modifica cliente</Text>
            <TouchableOpacity onPress={salvaCliente}>
              <Text style={styles.modalFullSave}>Salva</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 14 }}>
            {[
              { label: 'NOME *', value: nuovoNomeCliente, setter: setNuovoNomeCliente, placeholder: 'es. Mario Rossi' },
              { label: 'TELEFONO', value: nuovoTelefono, setter: setNuovoTelefono, placeholder: 'es. 339 1234567', keyboard: 'phone-pad' as const },
              { label: 'EMAIL', value: nuovaEmail, setter: setNuovaEmail, placeholder: 'es. mario@gmail.com', keyboard: 'email-address' as const },
              { label: 'INDIRIZZO', value: nuovoIndirizzo, setter: setNuovoIndirizzo, placeholder: 'es. Via Roma 1, Milano' },
            ].map(f => (
              <View key={f.label} style={styles.modalFieldGroup}>
                <Text style={styles.modalFieldLabel}>{f.label}</Text>
                <TextInput
                  style={styles.modalFieldInput}
                  value={f.value}
                  onChangeText={v => { f.setter(v); setModificheNonSalvate(true) }}
                  placeholder={f.placeholder}
                  placeholderTextColor="#9CA3AF"
                  keyboardType={f.keyboard}
                  autoCapitalize={f.keyboard === 'email-address' ? 'none' : 'sentences'}
                />
              </View>
            ))}
            <View style={styles.modalFieldGroup}>
              <Text style={styles.modalFieldLabel}>NOTE</Text>
              <TextInput
                style={[styles.modalFieldInput, { height: 100, textAlignVertical: 'top' }]}
                value={nuoveNote}
                onChangeText={v => { setNuoveNote(v); setModificheNonSalvate(true) }}
                placeholder="Note aggiuntive..."
                placeholderTextColor="#9CA3AF"
                multiline
              />
            </View>
          </ScrollView>
        </View>
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
  headerActions: { flexDirection: 'row', gap: 12, width: 50, justifyContent: 'flex-end' },
  headerActionText: { fontSize: 18 },
  scroll: { flex: 1 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  avatarRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' as const },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#0D1B2A', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '700' as const },
  avatarInfo: { flex: 1, gap: 3 },
  clienteNome: { fontSize: 18, fontWeight: '700' as const, color: '#0D1B2A' },
  clienteInfo: { fontSize: 13, color: '#6B7280' },
  clienteNote: { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' as const, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  statVal: { fontSize: 20, fontWeight: '700' as const, color: '#0D1B2A' },
  statLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 4, borderWidth: 1, borderColor: '#E5E7EB' },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' as const },
  tabBtnActive: { backgroundColor: '#0D1B2A' },
  tabText: { fontSize: 12, fontWeight: '500' as const, color: '#9CA3AF' },
  tabTextActive: { color: '#fff' },
  empty: { alignItems: 'center' as const, paddingTop: 40 },
  emptyText: { fontSize: 14, color: '#9CA3AF', marginBottom: 12 },
  prevCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  prevCardOld: { opacity: 0.6 },
  prevRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  prevLeft: { flex: 1 },
  prevBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  prevVersione: { fontSize: 13, fontWeight: '700' as const, color: '#0D1B2A' },
  prevUltimo: { fontSize: 11, color: '#0E9F8E', fontWeight: '600' as const },
  prevData: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  prevRightRow: { alignItems: 'flex-end' as const, gap: 6 },
  prevRight: { alignItems: 'flex-end' as const },
  prevImporto: { fontSize: 14, fontWeight: '600' as const, color: '#0D1B2A' },
  prevStato: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  prevDetail: { padding: 14, borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 10 },
  prevTesto: { fontSize: 12, color: '#6B7280', lineHeight: 18, fontFamily: 'monospace' },
  editBtn: { backgroundColor: '#0D1B2A', borderRadius: 10, padding: 10, alignItems: 'center' as const },
  editBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' as const },
  spostaBtn: { borderRadius: 10, padding: 10, alignItems: 'center' as const, borderWidth: 1, borderColor: '#E5E7EB' },
  postaBtnText: { fontSize: 13, color: '#6B7280', fontWeight: '500' as const },
  chiamataCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  chiamataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  chiamataTitolo: { fontSize: 14, fontWeight: '500' as const, color: '#0D1B2A' },
  chiamataData: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  chiamataArrow: { fontSize: 12, color: '#9CA3AF' },
  chiamataDetail: { padding: 14, borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 10 },
  chiamataTesto: { fontSize: 12, color: '#6B7280', lineHeight: 18 },
  cronologiaBtn: { paddingVertical: 8, alignItems: 'center' as const },
  cronologiaBtnText: { fontSize: 13, color: '#0E9F8E', fontWeight: '500' as const },
  cronologiaItem: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#F7F8FA', borderRadius: 8, padding: 10 },
  cronologiaVer: { fontSize: 13, fontWeight: '700' as const, color: '#9CA3AF' },
  cronologiaData: { fontSize: 12, color: '#9CA3AF' },
  cronologiaImporto: { fontSize: 12, color: '#9CA3AF' },
  cronologiaDetail: { backgroundColor: '#F7F8FA', borderRadius: 10, padding: 12, gap: 10 },
  ripristinaBtn: { backgroundColor: '#0E9F8E', borderRadius: 10, padding: 10, alignItems: 'center' as const },
  ripristinaBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' as const },
  nuovoBtn: { backgroundColor: '#0E9F8E', margin: 16, marginTop: 8, borderRadius: 14, padding: 14, alignItems: 'center' as const },
  nuovoBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' as const },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center' as const, alignItems: 'center' as const, padding: 32 },
  modalBox: { backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '100%' },
  modalTitle: { fontSize: 16, fontWeight: '600' as const, color: '#0D1B2A', marginBottom: 16, textAlign: 'center' as const },
  modalOption: { flexDirection: 'row', alignItems: 'center' as const, gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalOptionIcon: { fontSize: 20 },
  modalOptionText: { fontSize: 15, color: '#0D1B2A', fontWeight: '500' as const, textTransform: 'capitalize' as const },
  modalCancel: { paddingTop: 14, alignItems: 'center' as const },
  modalCancelText: { fontSize: 14, color: '#9CA3AF' },
  modalInput: { backgroundColor: '#F7F8FA', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 12, fontSize: 14, color: '#0D1B2A', marginBottom: 12 },
  modalSaveBtn: { backgroundColor: '#0D1B2A', borderRadius: 12, padding: 14, alignItems: 'center' as const, marginBottom: 8 },
  modalSaveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' as const },
  modalFullContainer: { flex: 1, backgroundColor: '#F7F8FA' },
  modalFullHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56, backgroundColor: '#0D1B2A' },
  modalFullTitle: { color: '#fff', fontSize: 16, fontWeight: '600' as const },
  modalFullClose: { color: '#9CA3AF', fontSize: 20, width: 40 },
  modalFullSave: { color: '#0E9F8E', fontSize: 15, fontWeight: '600' as const, width: 40, textAlign: 'right' as const },
  modalFieldGroup: { gap: 6 },
  modalFieldLabel: { fontSize: 11, fontWeight: '600' as const, color: '#9CA3AF', letterSpacing: 0.8 },
  modalFieldInput: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 12, fontSize: 14, color: '#0D1B2A' },
  prevCardSelected: { borderColor: '#0E9F8E', borderWidth: 2 },
  checkCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#D1D5DB', marginRight: 8, justifyContent: 'center', alignItems: 'center' as const },
  checkCircleActive: { backgroundColor: '#0E9F8E', borderColor: '#0E9F8E' },
  checkMark: { color: '#fff', fontSize: 14, fontWeight: '700' as const },
  selectionBar: { backgroundColor: '#0D1B2A', paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  selectionCancel: { padding: 4 },
  selectionCancelText: { color: '#9CA3AF', fontSize: 18 },
  selectionCount: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '600' as const },
  selectionActions: { flexDirection: 'row', gap: 12 },
  selectionAction: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)' },
  selectionActionDelete: { backgroundColor: 'rgba(239,68,68,0.15)' },
  selectionActionText: { color: '#fff', fontSize: 13, fontWeight: '500' as const },
  // Abbonamento
  abEmpty: { alignItems: 'center' as const, paddingTop: 40, gap: 10 },
  abEmptyIcon: { fontSize: 40 },
  abEmptyTitle: { fontSize: 16, fontWeight: '700', color: '#0D1B2A' },
  abEmptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' as const, paddingHorizontal: 20 },
  abCreaBtn: { backgroundColor: '#0D1B2A', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, marginTop: 8 },
  abCreaBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' as const },
  abCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  abCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  abCardLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  abCardImporto: { fontSize: 22, fontWeight: '700' as const, color: '#0D1B2A', marginTop: 2 },
  abCardGiorno: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  abAggiungiBtn: { alignItems: 'center' as const, padding: 12 },
  abAggiungiText: { fontSize: 13, color: '#0E9F8E', fontWeight: '500' as const },
  // Rata card
  rataCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', padding: 14, gap: 10 },
  rataCardCorrente: { borderColor: '#0E9F8E', borderWidth: 1.5 },
  rataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  rataMese: { fontSize: 14, fontWeight: '600', color: '#0D1B2A' },
  rataMeseTag: { fontSize: 10, fontWeight: '600', color: '#0E9F8E', backgroundColor: '#F0FDF4', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  rataNota: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  rataImporto: { fontSize: 15, fontWeight: '700', color: '#0D1B2A' },
  rataStato: { fontSize: 11, marginTop: 2, fontWeight: '500' },
  rataBarraContainer: { gap: 4 },
  rataBarra: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
  rataBarraFill: { height: 6, backgroundColor: '#F59E0B', borderRadius: 3 },
  rataBarraLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  rataBarraAcconto: { fontSize: 11, color: '#F59E0B', fontWeight: '500' },
  rataBarraResiduo: { fontSize: 11, color: '#EF4444', fontWeight: '500' },
  rataAzioni: { flexDirection: 'row', gap: 8 },
  rataAzioneBtn: { flex: 1, borderRadius: 10, padding: 9, alignItems: 'center' as const, borderWidth: 1, borderColor: '#0E9F8E' },
  rataAzioneBtnText: { fontSize: 13, color: '#0E9F8E', fontWeight: '600' as const },
  // Modal riepilogo rata
  modalRiepilogo: { backgroundColor: '#F7F8FA', borderRadius: 12, padding: 12, marginBottom: 16, gap: 6 },
  modalRiepilogoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  modalRiepilogoLabel: { fontSize: 13, color: '#6B7280' },
  modalRiepilogoVal: { fontSize: 13, fontWeight: '700', color: '#0D1B2A' },
})
