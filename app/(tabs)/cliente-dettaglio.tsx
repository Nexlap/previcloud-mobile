import * as FileSystem from 'expo-file-system/legacy'
import { router, useLocalSearchParams, useNavigation } from 'expo-router'
import * as Sharing from 'expo-sharing'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator, Alert, BackHandler, Modal,
  RefreshControl,
  ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View
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
  preventivo_padre_id: string | null
  cliente_id: string | null
  nome_cliente: string | null
  titolo: string | null
  pdf_url: string | null
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
  const [refreshing, setRefreshing] = useState(false)
  const [tab, setTab] = useState<'preventivi' | 'chiamate'>('preventivi')
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
  const navigation = useNavigation()

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

  async function onRefresh() {
    setRefreshing(true)
    await carica()
    setRefreshing(false)
  }

  async function carica() {
    const { data: cl } = await supabase.from('clienti').select('*').eq('id', id).single()
    if (cl) setCliente(cl)

    const { data: prevs } = await supabase
      .from('preventivi').select('*')
      .eq('cliente_id', id)
      .eq('is_ultimo', true)
      .order('created_at', { ascending: false })
    if (prevs) setPreventivi(prevs)

    const { data: trascr } = await supabase
      .from('trascrizioni').select('*')
      .eq('cliente_id', id)
      .order('created_at', { ascending: false })
    if (trascr) setTrascrizioni(trascr)

    setLoading(false)
  }

  async function eliminaPreventivo(prevId: string) {
    Alert.alert('Elimina', 'Vuoi eliminare questo preventivo?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina', style: 'destructive', onPress: async () => {
          await supabase.from('preventivi').delete().eq('id', prevId)
          setPreventivi(p => p.filter(x => x.id !== prevId))
        }
      }
    ])
  }

  async function cambiaStato(prevId: string, stato: string) {
    await supabase.from('preventivi').update({ stato }).eq('id', prevId)
    setPreventivi(p => p.map(x => x.id === prevId ? { ...x, stato } : x))
  }

  async function caricaClientiDisponibili() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('clienti').select('id, nome')
      .eq('user_id', user.id).neq('id', id).order('nome')
    if (data) setClientiDisponibili(data)
  }

  async function spostaPreventivo(prevId: string, nuovoClienteId: string, nuovoClienteNome: string) {
    await supabase.from('preventivi').update({
      cliente_id: nuovoClienteId,
      nome_cliente: nuovoClienteNome
    }).eq('id', prevId)
    setPreventivi(p => p.filter(x => x.id !== prevId))
    setMostraModalSposta(null)
    Alert.alert('✓ Spostato', `Preventivo spostato a ${nuovoClienteNome}`)
  }

  async function rinominaPreventivo(prevId: string, titolo: string) {
    await supabase.from('preventivi').update({ titolo }).eq('id', prevId)
    setPreventivi(p => p.map(x => x.id === prevId ? { ...x, titolo } : x))
    setMostraModalRinomina(null)
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

  async function caricaCronologia(preventivoId: string, padreId: string | null) {
    if (cronologiaAperta === preventivoId) { setCronologiaAperta(null); return }
    if (!padreId) return
    const versioni: Preventivo[] = []
    let currentId: string | null = padreId
    while (currentId) {
      const { data }: { data: Preventivo | null } = await supabase
        .from('preventivi').select('*').eq('id', currentId).single()
      if (!data) break
      versioni.unshift(data)
      currentId = data.preventivo_padre_id
    }
    if (versioni.length > 0) {
      setCronologia(c => ({ ...c, [preventivoId]: versioni }))
      setCronologiaAperta(preventivoId)
    }
  }

  async function eliminaCliente() {
    Alert.alert('Elimina cliente', 'Vuoi eliminare questo cliente?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina', style: 'destructive', onPress: async () => {
          await supabase.from('clienti').delete().eq('id', id)
          router.back()
        }
      }
    ])
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
    {
      text: 'Elimina', style: 'destructive', onPress: async () => {
        await Promise.all(selezione.map(id => supabase.from('preventivi').delete().eq('id', id)))
        setPreventivi(p => p.filter(x => !selezione.includes(x.id)))
        annullaSelezione()
      }
    }
  ])
}

async function spostaSelezionati(nuovoClienteId: string, nuovoClienteNome: string) {
  await Promise.all(selezione.map(id =>
    supabase.from('preventivi').update({ cliente_id: nuovoClienteId, nome_cliente: nuovoClienteNome }).eq('id', id)
  ))
  setPreventivi(p => p.filter(x => !selezione.includes(x.id)))
  annullaSelezione()
  setMostraModalSposta(null)
  Alert.alert('✓ Spostati', `${selezione.length} preventivi spostati a ${nuovoClienteNome}`)
}

  const totaleValore = preventivi.filter(p => p.is_ultimo).reduce((a, p) => a + (p.importo_totale || 0), 0)

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
        <Text style={styles.headerTitle} numberOfLines={1}>{cliente?.nome || nome}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => {
  setNuovoNomeCliente(cliente?.nome || '')
  setNuovoTelefono(cliente?.telefono || '')
  setNuovaEmail(cliente?.email || '')
  setNuovoIndirizzo(cliente?.indirizzo || '')
  setNuoveNote(cliente?.note || '')
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
      <TouchableOpacity
        style={styles.selectionAction}
        onPress={async () => { await caricaClientiDisponibili(); setMostraModalSposta('multi') }}
      >
        <Text style={styles.selectionActionText}>↗ Sposta</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.selectionAction, styles.selectionActionDelete]} onPress={eliminaSelezionati}>
        <Text style={[styles.selectionActionText, { color: '#EF4444' }]}>🗑 Elimina</Text>
      </TouchableOpacity>
    </View>
  </View>
)}
      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16, gap: 12 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0E9F8E" colors={["#0E9F8E"]} />}>

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

        <View style={styles.tabs}>
          <TouchableOpacity style={[styles.tabBtn, tab === 'preventivi' && styles.tabBtnActive]} onPress={() => setTab('preventivi')}>
            <Text style={[styles.tabText, tab === 'preventivi' && styles.tabTextActive]}>Preventivi</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, tab === 'chiamate' && styles.tabBtnActive]} onPress={() => setTab('chiamate')}>
            <Text style={[styles.tabText, tab === 'chiamate' && styles.tabTextActive]}>Chiamate</Text>
          </TouchableOpacity>
        </View>

        {tab === 'preventivi' && (
          preventivi.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Nessun preventivo per questo cliente</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push({
                pathname: '/(tabs)/nuovo',
                params: { cliente_id: id, cliente_nome: cliente?.nome || nome }
              })}>
                <Text style={styles.emptyBtnText}>Genera preventivo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            preventivi.map(p => (
              <TouchableOpacity
  key={p.id}
  style={[
    styles.prevCard,
    !p.is_ultimo && styles.prevCardOld,
    selezione.includes(p.id) && styles.prevCardSelected
  ]}
  onPress={() => {
    if (modalitaSelezione) {
      toggleSelezione(p.id)
    } else {
      setAperto(aperto === p.id ? null : p.id)
    }
  }}
  onLongPress={() => iniziaSelezione(p.id)}
>
                <View style={styles.prevRow}>
                  {modalitaSelezione && (
  <View style={[styles.checkCircle, selezione.includes(p.id) && styles.checkCircleActive]}>
    {selezione.includes(p.id) && <Text style={styles.checkMark}>✓</Text>}
  </View>
)}
                  <View style={styles.prevLeft}>
                    <View style={styles.prevBadgeRow}>
                      <Text style={styles.prevVersione}>{p.titolo || `v${p.versione || 1}`}</Text>
                      {p.is_ultimo && <Text style={styles.prevUltimo}>● attivo</Text>}
                    </View>
                    <Text style={styles.prevData}>{new Date(p.created_at).toLocaleDateString('it-IT')}</Text>
                  </View>
                  <View style={styles.prevRightRow}>
                    <TouchableOpacity style={styles.prevRight} onPress={() => setModalStato(p.id)}>
                      <Text style={styles.prevImporto}>{p.importo_totale ? `€${p.importo_totale}` : '—'}</Text>
                      <Text style={[styles.prevStato,
                        p.stato === 'accettato' ? { color: '#0E9F8E' } :
                        p.stato === 'rifiutato' ? { color: '#EF4444' } :
                        p.stato === 'inviato' ? { color: '#1D4ED8' } : {}
                      ]}>{p.stato} ▼</Text>
                    </TouchableOpacity>
<TouchableOpacity
  onPress={async () => {
  if (p.pdf_url) {
    try {
      const fileName = `${FileSystem.cacheDirectory}preventivo_${p.id}.pdf`
      const { uri } = await FileSystem.downloadAsync(p.pdf_url, fileName)
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Apri preventivo',
        UTI: 'com.adobe.pdf'
      })
    } catch (e) {
      Alert.alert('Errore', 'Impossibile aprire il PDF')
    }
  } else {
    router.push({
      pathname: '/(tabs)/preventivo-pdf',
      params: { testo: p.testo_preventivo || '', cliente_id: p.cliente_id || '' }
    })
  }
}}
>
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
                        <TouchableOpacity
                          style={styles.cronologiaItem}
                          onPress={() => setCronologiaVersioneAperta(cronologiaVersioneAperta === v.id ? null : v.id)}
                        >
                          <Text style={styles.cronologiaVer}>v{v.versione || 1}</Text>
                          <Text style={styles.cronologiaData}>{new Date(v.created_at).toLocaleDateString('it-IT')}</Text>
                          <Text style={styles.cronologiaImporto}>{v.importo_totale ? `€${v.importo_totale}` : '—'}</Text>
                        </TouchableOpacity>
                        {cronologiaVersioneAperta === v.id && (
                          <View style={styles.cronologiaDetail}>
                            <Text style={styles.prevTesto}>{v.testo_preventivo}</Text>
                            <TouchableOpacity
                              style={styles.ripristinaBtn}
                              onPress={() => router.push({
                                pathname: '/(tabs)/nuovo',
                                params: {
                                  testo_modifica: v.testo_preventivo || '',
                                  versione_padre_id: p.id,
                                  versione_numero: String((p.versione || 1) + 1)
                                }
                              })}
                            >
                              <Text style={styles.ripristinaBtnText}>✏️ Modifica e genera nuova versione</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    ))}

                    {p.is_ultimo && (
                      <TouchableOpacity
                        style={styles.editBtn}
                        onPress={() => router.push({
                          pathname: '/(tabs)/nuovo',
                          params: {
                            testo_modifica: p.testo_preventivo || '',
                            versione_padre_id: p.id,
                            versione_numero: String((p.versione || 1) + 1)
                          }
                        })}
                      >
                        <Text style={styles.editBtnText}>✏️ Modifica e genera v{(p.versione || 1) + 1}</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.spostaBtn}
                      onPress={async () => { await caricaClientiDisponibili(); setMostraModalSposta(p.id) }}
                    >
                      <Text style={styles.postaBtnText}>↗ Sposta ad altro cliente</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.spostaBtn}
                      onPress={() => { setNuovoTitolo(p.titolo || ''); setMostraModalRinomina(p.id) }}
                    >
                      <Text style={styles.postaBtnText}>✏️ Rinomina preventivo</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )
        )}

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
                    <Text style={styles.chiamataData}>{new Date(t.created_at).toLocaleDateString('it-IT')} · {formatDurata(t.durata_secondi)}</Text>
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

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal cambia stato */}
      <Modal visible={modalStato !== null} transparent animationType="fade" onRequestClose={() => setModalStato(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalStato(null)}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Cambia stato</Text>
            {['bozza', 'inviato', 'accettato', 'rifiutato'].map(s => (
              <TouchableOpacity key={s} style={styles.modalOption} onPress={() => { if (modalStato) cambiaStato(modalStato, s); setModalStato(null) }}>
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

      {/* Modal sposta cliente */}
      <Modal visible={mostraModalSposta !== null} transparent animationType="fade" onRequestClose={() => setMostraModalSposta(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMostraModalSposta(null)}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Sposta a quale cliente?</Text>
            {clientiDisponibili.length === 0 ? (
              <Text style={{ textAlign: 'center', color: '#9CA3AF', padding: 20 }}>Nessun altro cliente disponibile</Text>
            ) : (
              clientiDisponibili.map(c => (
                <TouchableOpacity key={c.id} style={styles.modalOption} onPress={() => {
  if (mostraModalSposta === 'multi') {
    spostaSelezionati(c.id, c.nome)
  } else if (mostraModalSposta) {
    spostaPreventivo(mostraModalSposta, c.id, c.nome)
  }
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
            <TextInput
              style={styles.modalInput}
              value={nuovoTitolo}
              onChangeText={setNuovoTitolo}
              placeholder="es. Preventivo caldaia"
              placeholderTextColor="#9CA3AF"
              autoFocus
            />
            <TouchableOpacity style={styles.modalSaveBtn} onPress={() => mostraModalRinomina && rinominaPreventivo(mostraModalRinomina, nuovoTitolo)}>
              <Text style={styles.modalSaveBtnText}>Salva</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setMostraModalRinomina(null)}>
              <Text style={styles.modalCancelText}>Annulla</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal rinomina cliente */}
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
      <View style={styles.modalFieldGroup}>
        <Text style={styles.modalFieldLabel}>NOME *</Text>
        <TextInput style={styles.modalFieldInput} value={nuovoNomeCliente} onChangeText={v => { setNuovoNomeCliente(v); setModificheNonSalvate(true) }} placeholder="es. Mario Rossi" placeholderTextColor="#9CA3AF" />
      </View>
      <View style={styles.modalFieldGroup}>
        <Text style={styles.modalFieldLabel}>TELEFONO</Text>
        <TextInput style={styles.modalFieldInput} value={nuovoTelefono} onChangeText={v => { setNuovoTelefono(v); setModificheNonSalvate(true) }} placeholder="es. 339 1234567" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" />
      </View>
      <View style={styles.modalFieldGroup}>
        <Text style={styles.modalFieldLabel}>EMAIL</Text>
        <TextInput style={styles.modalFieldInput} value={nuovaEmail} onChangeText={v => { setNuovaEmail(v); setModificheNonSalvate(true) }} placeholder="es. mario@gmail.com" placeholderTextColor="#9CA3AF" keyboardType="email-address" autoCapitalize="none" />
      </View>
      <View style={styles.modalFieldGroup}>
        <Text style={styles.modalFieldLabel}>INDIRIZZO</Text>
        <TextInput style={styles.modalFieldInput} value={nuovoIndirizzo} onChangeText={v => { setNuovoIndirizzo(v); setModificheNonSalvate(true) }} placeholder="es. Via Roma 1, Milano" placeholderTextColor="#9CA3AF" />
      </View>
      <View style={styles.modalFieldGroup}>
        <Text style={styles.modalFieldLabel}>NOTE</Text>
        <TextInput style={[styles.modalFieldInput, { height: 100, textAlignVertical: 'top' }]} value={nuoveNote} onChangeText={v => { setNuoveNote(v); setModificheNonSalvate(true) }} placeholder="Note aggiuntive..." placeholderTextColor="#9CA3AF" multiline />
      </View>
    </ScrollView>
  </View>
</Modal>    </View>
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
  tabText: { fontSize: 14, fontWeight: '500' as const, color: '#9CA3AF' },
  tabTextActive: { color: '#fff' },
  empty: { alignItems: 'center' as const, paddingTop: 40 },
  emptyText: { fontSize: 14, color: '#9CA3AF', marginBottom: 12 },
  emptyBtn: { backgroundColor: '#0D1B2A', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  emptyBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' as const },
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
})