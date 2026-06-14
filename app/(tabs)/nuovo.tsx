import { router, useLocalSearchParams, useNavigation } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native'
import { cercaCliente, creaClienteDaChat, inviaMessaggio } from "../../lib/api/chat"
import { convertiRecap } from "../../lib/api/pdf"
import { supabase } from "../../lib/supabase"
import { Messaggio } from "../../lib/types"

//
type Params = {
  trascrizione: string       //
  trascrizioneId: string
  preventivo_id: string      //
  testo_modifica: string     //
  versione_padre_id: string
  versione_numero: string
  cliente_id: string         //
  cliente_nome: string
}

export default function Nuovo() {
  const params = useLocalSearchParams<Params>()
  const navigation = useNavigation()

  //
  const [input, setInput] = useState('')
  const [messaggi, setMessaggi] = useState<Messaggio[]>([])
  const [loading, setLoading] = useState(false)
  const [token, setToken] = useState('')
  const [recap, setRecap] = useState('')
  const [preventivo, setPreventivo] = useState('')
  const [salvato, setSalvato] = useState(false)
  const [modalitaScelta, setModalitaScelta] = useState(true)
  const [metodiPagamento, setMetodiPagamento] = useState<any[]>([])
  const [metodoPagamentoSelezionato, setMetodoPagamentoSelezionato] = useState<any | null>(null)
  const [mostraModalPagamento, setMostraModalPagamento] = useState(false)

  //
  const [clienteIdAttivo, setClienteIdAttivo] = useState('')
  const [clienteRilevato, setClienteRilevato] = useState<{ id: string, nome: string } | null>(null)
  const [clientiSuggeriti, setClientiSuggeriti] = useState<{ id: string, nome: string, telefono: string | null, email: string | null }[]>([])
  const [mostraModalCliente, setMostraModalCliente] = useState(false)
  const [nomeClienteNuovo, setNomeClienteNuovo] = useState('')
  const [datiClienteNuovo, setDatiClienteNuovo] = useState({ telefono: '', email: '', indirizzo: '' })
  const [mostraFormDatiCliente, setMostraFormDatiCliente] = useState(false)

  const scrollRef = useRef<ScrollView>(null)

  //
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/(auth)/login'); return }
      setToken(session.access_token)
    })
    caricaMetodiPagamento()
  }, [])

  async function caricaMetodiPagamento() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('metodi_pagamento').select('*').eq('user_id', user.id).order('predefinito', { ascending: false })
    if (data) {
      setMetodiPagamento(data)
      const predefinito = data.find((m: any) => m.predefinito)
      if (predefinito) setMetodoPagamentoSelezionato(predefinito)
    }
  }

  function parametriPDF(testo: string) {
    return {
      testo,
      versione_padre_id: params.versione_padre_id || '',
      cliente_id: clienteIdAttivo || params.cliente_id || '',
      metodo_pagamento_id: metodoPagamentoSelezionato?.id || ''
    }
  }

  useEffect(() => {
    if (params.cliente_id) {
      setClienteIdAttivo(params.cliente_id)
      if (params.cliente_nome) setClienteRilevato({ id: params.cliente_id, nome: params.cliente_nome })
    }
  }, [params.cliente_id])

  //
  useEffect(() => {
    if (params.trascrizione && messaggi.length === 0) {
      setModalitaScelta(false)
      setInput(params.trascrizione)
    }
  }, [params.trascrizione])

  //
  useEffect(() => {
    if (params.testo_modifica && messaggi.length === 0) {
      setModalitaScelta(false)
      setMessaggi([{
        role: 'assistant',
        content: `Ho caricato il tuo preventivo v${parseInt(params.versione_numero || '2') - 1}. Cosa vuoi modificare?\n\n${params.testo_modifica}`
      }])
    }
  }, [params.testo_modifica])

  //
  useEffect(() => {
    if (params.preventivo_id) {
      supabase.from('preventivi')
        .select('testo_preventivo, messaggi_chat')
        .eq('id', params.preventivo_id)
        .single()
        .then(({ data }) => {
          if (data?.messaggi_chat) setMessaggi(data.messaggi_chat as Messaggio[])
          if (data?.testo_preventivo) setPreventivo(data.testo_preventivo)
        })
    }
  }, [params.preventivo_id])

  //
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (messaggi.length === 0 && !recap) return
      if (preventivo) return
      e.preventDefault()
      Alert.alert('Salva bozza', 'Vuoi salvare la conversazione come bozza prima di uscire?', [
        { text: 'Abbandona', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
        { text: 'Continua', style: 'cancel' },
        { text: 'Salva bozza', onPress: async () => {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            await supabase.from('preventivi').insert({
              user_id: user.id,
              testo_preventivo: recap || messaggi.filter(m => m.role === 'assistant').pop()?.content || '',
              messaggi_chat: messaggi,
              stato: 'bozza',
              is_ultimo: true,
              versione: 1,
              titolo: 'Bozza — ' + new Date().toLocaleDateString('it-IT')
            })
          }
          navigation.dispatch(e.data.action)
        }}
      ])
    })
    return unsubscribe
  }, [messaggi, recap, preventivo])

  //
  async function gestisciClienteDaRisposta(nome: string) {
    try {
      const risultati = await cercaCliente(nome, token)
      if (risultati.length === 1) {
        setClienteIdAttivo(risultati[0].id)
        setClienteRilevato(risultati[0])
      } else if (risultati.length > 1) {
        setClientiSuggeriti(risultati)
        setMostraModalCliente(true)
      } else {
        setNomeClienteNuovo(nome)
        setClientiSuggeriti([])
        setMostraModalCliente(true)
      }
    } catch {}
  }

  async function creaClienteNuovo() {
    try {
      const cliente = await creaClienteDaChat({ nome: nomeClienteNuovo, ...datiClienteNuovo }, token)
      if (cliente) {
        setClienteIdAttivo(cliente.id)
        setClienteRilevato({ id: cliente.id, nome: cliente.nome })
      }
    } catch {}
    setMostraModalCliente(false)
    setMostraFormDatiCliente(false)
  }

  //
  async function invia(testoForzato?: string) {
    const testo = (testoForzato || input).trim()
    if (!testo || loading) return
    if (!testoForzato) setInput('')
    setLoading(true)

    const nuovi: Messaggio[] = [...messaggi, { role: 'user', content: testo }]
    setMessaggi(nuovi)

    try {
      let reply = await inviaMessaggio(nuovi, token, clienteIdAttivo)

      //
      if (reply.includes('CLIENTE:') && !clienteIdAttivo) {
        const match = reply.match(/CLIENTE:([^\n]+)/)
        if (match) {
          const nomeCliente = match[1].trim()
          reply = reply.replace(/CLIENTE:[^\n]+\n?/, '').trim()
          await gestisciClienteDaRisposta(nomeCliente)
        }
      }

      if (reply.includes('PREVENTIVO_PRONTO')) {
        const [pre, post] = reply.split('PREVENTIVO_PRONTO')
        if (pre.trim()) setMessaggi([...nuovi, { role: 'assistant', content: pre.trim() }])
        setPreventivo(post.trim())
        setRecap('')
      } else if (reply.includes('RECAP_PRONTO')) {
        const [pre, post] = reply.split('RECAP_PRONTO')
        if (pre.trim()) setMessaggi([...nuovi, { role: 'assistant', content: pre.trim() }])
        setRecap(post.trim())
      } else {
        setMessaggi([...nuovi, { role: 'assistant', content: reply }])
      }
    } catch (e: any) {
      Alert.alert('Errore', e.message)
    }

    setLoading(false)
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
  }

  //
  async function salva() {
    if (!preventivo || salvato) return
    const match = preventivo.match(/TOTALE[:\s]*€?\s*([\d.,]+)/i)
    const importo = match ? parseFloat(match[1].replace(',', '.')) : null
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('preventivi').insert({
      user_id: user.id,
      testo_preventivo: preventivo,
      importo_totale: importo,
      stato: 'bozza',
      is_ultimo: true,
      versione: 1,
    })
    setSalvato(true)
    Alert.alert('Salvato!', 'Preventivo salvato nello storico.')
  }

  function ricomincia() {
    setMessaggi([])
    setPreventivo('')
    setSalvato(false)
    setInput('')
    setRecap('')
    setModalitaScelta(true)
  }

  //
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (!modalitaScelta && messaggi.length === 0 && !recap && !preventivo) {
              setModalitaScelta(true)
            } else {
              router.back()
            }
          }}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {params.testo_modifica ? `Modifica v${parseInt(params.versione_numero || '2') - 1}` : 'Nuovo preventivo'}
        </Text>
        {preventivo
          ? <TouchableOpacity onPress={ricomincia}><Text style={styles.nuovoText}>Nuovo</Text></TouchableOpacity>
          : <View style={{ width: 50 }} />
        }
      </View>

      {/* ── Schermata scelta modalità ── */}
      {modalitaScelta && !recap && !preventivo && messaggi.length === 0 && !params.testo_modifica ? (
        <View style={styles.sceltaContainer}>
          <Text style={styles.sceltaTitolo}>Come vuoi iniziare?</Text>
          <Text style={styles.sceltaSub}>Scegli il metodo più comodo per te</Text>

          {params.cliente_nome ? (
            <View style={styles.clienteBadge}>
              <Text style={styles.clienteBadgeText}>
                👤 Preventivo per: <Text style={{ fontWeight: '700' }}>{params.cliente_nome}</Text>
              </Text>
            </View>
          ) : null}

          {[
            { icon: '🎙', title: 'Registra voce', sub: 'Parla del lavoro, trascrivo e genero automaticamente', onPress: () => router.push('/screens/registra') },
            { icon: '✍️', title: 'Scrivi tu', sub: "Descrivi il lavoro a testo, l'AI fa le domande giuste", onPress: () => setModalitaScelta(false) },
            { icon: '📋', title: 'Builder manuale', sub: 'Seleziona i servizi dal listino e assembla', onPress: () => router.push({ pathname: '/screens/builder', params: { cliente_id: clienteIdAttivo || params.cliente_id || '', cliente_nome: params.cliente_nome || '' } }) },
          ].map(item => (
            <TouchableOpacity key={item.title} style={styles.sceltaCard} onPress={item.onPress}>
              <Text style={styles.sceltaCardIcon}>{item.icon}</Text>
              <View style={styles.sceltaCardBody}>
                <Text style={styles.sceltaCardTitle}>{item.title}</Text>
                <Text style={styles.sceltaCardSub}>{item.sub}</Text>
              </View>
              <Text style={styles.sceltaCardArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

      /* ── Schermata recap ── */
      ) : recap ? (
        <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16 }}>
          <View style={styles.recapCard}>
            <View style={styles.recapHeader}>
              <Text style={styles.recapHeaderTitle}>📋 Riepilogo lavoro</Text>
              <Text style={styles.recapHeaderSub}>Conferma o modifica prima di generare</Text>
            </View>
            <Text style={styles.recapText}>{recap}</Text>
            <TouchableOpacity style={styles.paymentCard} onPress={() => setMostraModalPagamento(true)}>
              <Text style={styles.paymentIcon}>{metodoPagamentoSelezionato ? (metodoPagamentoSelezionato.tipo === 'bonifico' ? '🏦' : metodoPagamentoSelezionato.tipo === 'paypal' ? '💙' : metodoPagamentoSelezionato.tipo === 'contanti' ? '💵' : '💳') : '💳'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.paymentLabel}>Pagamento</Text>
                <Text style={styles.paymentValue}>{metodoPagamentoSelezionato ? metodoPagamentoSelezionato.nome : 'Nessun metodo selezionato'}</Text>
              </View>
              <Text style={styles.paymentArrow}>›</Text>
            </TouchableOpacity>
            <View style={styles.recapActions}>
              <TouchableOpacity
                style={styles.recapConfirmBtn}
                onPress={async () => {
                  setLoading(true)
                  try {
                    const preventivo = await convertiRecap(recap, token)
                    setRecap('')
                    router.push({
                      pathname: '/screens/preventivo-pdf',
                      params: parametriPDF(preventivo)
                    })
                  } catch (e: any) { Alert.alert('Errore', e.message) }
                  setLoading(false)
                }}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.recapConfirmText}>✓ Genera preventivo</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity style={styles.recapEditBtn} onPress={() => { setRecap(''); setInput('') }}>
                <Text style={styles.recapEditText}>✏️ Modifica</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

      /* ── Schermata preventivo generato ── */
      ) : preventivo ? (
        <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16 }}>
          <View style={styles.prevCard}>
            <View style={styles.prevHeader}>
              <Text style={styles.prevHeaderTitle}>Preventivo generato ✓</Text>
              <Text style={styles.prevHeaderSub}>Pronto da inviare al cliente</Text>
            </View>
            <View style={styles.prevBody}>
              <Text style={styles.prevText}>{preventivo}</Text>
            </View>
          </View>
          <TouchableOpacity style={[styles.saveBtn, salvato && styles.saveBtnDone]} onPress={salva} disabled={salvato}>
            <Text style={styles.saveBtnText}>{salvato ? '✓ Salvato nello storico' : 'Salva nello storico'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.paymentCard} onPress={() => setMostraModalPagamento(true)}>
            <Text style={styles.paymentIcon}>{metodoPagamentoSelezionato ? (metodoPagamentoSelezionato.tipo === 'bonifico' ? '🏦' : metodoPagamentoSelezionato.tipo === 'paypal' ? '💙' : metodoPagamentoSelezionato.tipo === 'contanti' ? '💵' : '💳') : '💳'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.paymentLabel}>Pagamento</Text>
              <Text style={styles.paymentValue}>{metodoPagamentoSelezionato ? metodoPagamentoSelezionato.nome : 'Nessun metodo selezionato'}</Text>
            </View>
            <Text style={styles.paymentArrow}>›</Text>
          </TouchableOpacity>          <TouchableOpacity
            style={styles.pdfBtn}
            onPress={() => router.push({ pathname: '/screens/preventivo-pdf', params: parametriPDF(preventivo) })}
          >
            <Text style={styles.pdfBtnText}>📄 Genera PDF professionale</Text>
          </TouchableOpacity>
        </ScrollView>

      /* ── Chat ── */
      ) : (
        <>
          <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.chatContent}>
            {messaggi.length === 0 && (
              <View style={styles.emptyChat}>
                <Text style={styles.emptyChatIcon}>💬</Text>
                <Text style={styles.emptyChatTitle}>Descrivi il lavoro</Text>
                <Text style={styles.emptyChatSub}>Anche vago — l'AI farà le domande giuste</Text>
              </View>
            )}
            {messaggi.map((m, i) => (
              <View key={i} style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleAI]}>
                <Text style={styles.bubbleWho}>{m.role === 'user' ? 'Tu' : 'PreventivoAI'}</Text>
                <Text style={[styles.bubbleText, m.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAI]}>
                  {m.content}
                </Text>
              </View>
            ))}
            {loading && (
              <View style={[styles.bubble, styles.bubbleAI]}>
                <Text style={styles.bubbleWho}>PreventivoAI</Text>
                <ActivityIndicator size="small" color="#0E9F8E" style={{ marginTop: 4 }} />
              </View>
            )}
          </ScrollView>

          <View style={styles.inputArea}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Descrivi il lavoro..."
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
              onPress={() => invia()}
              disabled={!input.trim() || loading}
            >
              <Text style={styles.sendBtnText}>→</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Badge cliente rilevato */}
      {clienteRilevato && !modalitaScelta && (
        <View style={styles.clienteRilevatoBadge}>
          <Text style={styles.clienteRilevatoBadgeText}>{`👤 ${clienteRilevato.nome}`}</Text>
          <TouchableOpacity onPress={() => { setClienteRilevato(null); setClienteIdAttivo('') }}>
            <Text style={styles.clienteRilevatoBadgeRemove}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal metodo pagamento */}
      {mostraModalPagamento && (
        <View style={styles.clienteModalOverlay}>
          <View style={styles.clienteModalBox}>
            <Text style={styles.clienteModalTitolo}>Metodo di pagamento</Text>
            <TouchableOpacity
              style={[styles.paymentOption, !metodoPagamentoSelezionato && styles.paymentOptionActive]}
              onPress={() => { setMetodoPagamentoSelezionato(null); setMostraModalPagamento(false) }}
            >
              <Text style={styles.paymentIcon}>🚫</Text>
              <Text style={styles.paymentOptionText}>Nessun metodo</Text>
              {!metodoPagamentoSelezionato && <Text style={styles.paymentCheck}>✓</Text>}
            </TouchableOpacity>
            {metodiPagamento.length === 0 ? (
              <TouchableOpacity style={styles.clienteModalBtn} onPress={() => { setMostraModalPagamento(false); router.push('/screens/pagamenti') }}>
                <Text style={styles.clienteModalBtnText}>Configura nelle impostazioni</Text>
              </TouchableOpacity>
            ) : (
              metodiPagamento.map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.paymentOption, metodoPagamentoSelezionato?.id === m.id && styles.paymentOptionActive]}
                  onPress={() => { setMetodoPagamentoSelezionato(m); setMostraModalPagamento(false) }}
                >
                  <Text style={styles.paymentIcon}>{m.tipo === 'bonifico' ? '🏦' : m.tipo === 'paypal' ? '💙' : m.tipo === 'contanti' ? '💵' : '💳'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.paymentOptionText}>{m.nome}</Text>
                    {m.tipo === 'bonifico' && m.dati?.iban && <Text style={styles.paymentOptionSub}>{m.dati.iban}</Text>}
                    {m.tipo === 'paypal' && m.dati?.email && <Text style={styles.paymentOptionSub}>{m.dati.email}</Text>}
                  </View>
                  {metodoPagamentoSelezionato?.id === m.id && <Text style={styles.paymentCheck}>✓</Text>}
                </TouchableOpacity>
              ))
            )}
            <TouchableOpacity style={styles.clienteModalSkip} onPress={() => setMostraModalPagamento(false)}>
              <Text style={styles.clienteModalSkipText}>Chiudi</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {/* Modal riconoscimento cliente */}
      {mostraModalCliente && (
        <View style={styles.clienteModalOverlay}>
          <View style={styles.clienteModalBox}>
            {clientiSuggeriti.length > 1 ? (
              <>
                <Text style={styles.clienteModalTitolo}>Chi è il cliente?</Text>
                <Text style={styles.clienteModalSub}>Ho trovato più clienti con questo nome</Text>
                {clientiSuggeriti.map(c => (
                  <TouchableOpacity key={c.id} style={styles.clienteModalOption} onPress={() => {
                    setClienteIdAttivo(c.id)
                    setClienteRilevato(c)
                    setMostraModalCliente(false)
                  }}>
                    <Text style={styles.clienteModalOptionNome}>{c.nome}</Text>
                    {c.email && <Text style={styles.clienteModalOptionInfo}>{c.email}</Text>}
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={styles.clienteModalSkip} onPress={() => setMostraModalCliente(false)}>
                  <Text style={styles.clienteModalSkipText}>Nessuno di questi</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.clienteModalTitolo}>Cliente non trovato</Text>
                <Text style={styles.clienteModalSub}>"{nomeClienteNuovo}" non è in rubrica. Vuoi aggiungerlo?</Text>
                {!mostraFormDatiCliente ? (
                  <>
                    <TouchableOpacity style={styles.clienteModalBtn} onPress={() => setMostraFormDatiCliente(true)}>
                      <Text style={styles.clienteModalBtnText}>➕ Sì, aggiungi con dati</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.clienteModalBtn} onPress={creaClienteNuovo}>
                      <Text style={styles.clienteModalBtnText}>✓ Sì, solo il nome</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.clienteModalSkip} onPress={() => setMostraModalCliente(false)}>
                      <Text style={styles.clienteModalSkipText}>No, continua senza</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    {[
                      { placeholder: 'Telefono', key: 'telefono', keyboard: 'phone-pad' as const },
                      { placeholder: 'Email', key: 'email', keyboard: 'email-address' as const },
                      { placeholder: 'Indirizzo', key: 'indirizzo', keyboard: 'default' as const },
                    ].map(f => (
                      <TextInput
                        key={f.key}
                        style={styles.clienteModalInput}
                        placeholder={f.placeholder}
                        placeholderTextColor="#9CA3AF"
                        value={(datiClienteNuovo as any)[f.key]}
                        onChangeText={v => setDatiClienteNuovo(d => ({ ...d, [f.key]: v }))}
                        keyboardType={f.keyboard}
                        autoCapitalize={f.keyboard === 'email-address' ? 'none' : 'sentences'}
                      />
                    ))}
                    <TouchableOpacity style={styles.clienteModalBtn} onPress={creaClienteNuovo}>
                      <Text style={styles.clienteModalBtnText}>Salva e continua</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.clienteModalSkip} onPress={() => { setMostraFormDatiCliente(false); creaClienteNuovo() }}>
                      <Text style={styles.clienteModalSkipText}>Salta i dati</Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  header: { backgroundColor: '#0D1B2A', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { padding: 4, width: 50 },
  backText: { color: '#9CA3AF', fontSize: 22 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  nuovoText: { color: '#0E9F8E', fontSize: 14, width: 50, textAlign: 'right' as const },
  scroll: { flex: 1 },
  chatContent: { padding: 16, gap: 12, flexGrow: 1 },
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyChatIcon: { fontSize: 40, marginBottom: 12 },
  emptyChatTitle: { fontSize: 16, fontWeight: '600', color: '#0D1B2A', textAlign: 'center' },
  emptyChatSub: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 6, paddingHorizontal: 32 },
  bubble: { maxWidth: '88%', borderRadius: 16, padding: 12 },
  bubbleUser: { alignSelf: 'flex-start', backgroundColor: '#EBF3FF', borderBottomLeftRadius: 4 },
  bubbleAI: { alignSelf: 'flex-end', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderBottomRightRadius: 4 },
  bubbleWho: { fontSize: 10, fontWeight: '600', color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextUser: { color: '#1E40AF' },
  bubbleTextAI: { color: '#0D1B2A' },
  inputArea: { flexDirection: 'row', gap: 10, padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB', alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: '#F7F8FA', borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 12, fontSize: 14, color: '#0D1B2A', maxHeight: 120 },
  sendBtn: { width: 44, height: 44, backgroundColor: '#0E9F8E', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: '#fff', fontSize: 20, fontWeight: '600' },
  sceltaContainer: { flex: 1, padding: 20, gap: 14 },
  sceltaTitolo: { fontSize: 24, fontWeight: '700', color: '#0D1B2A', marginTop: 8 },
  sceltaSub: { fontSize: 14, color: '#9CA3AF', marginBottom: 8 },
  sceltaCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  sceltaCardIcon: { fontSize: 28 },
  sceltaCardBody: { flex: 1, gap: 3 },
  sceltaCardTitle: { fontSize: 16, fontWeight: '600', color: '#0D1B2A' },
  sceltaCardSub: { fontSize: 12, color: '#9CA3AF', lineHeight: 17 },
  sceltaCardArrow: { fontSize: 22, color: '#9CA3AF' },
  clienteBadge: { backgroundColor: '#EBF3FF', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#BFDBFE' },
  clienteBadgeText: { fontSize: 13, color: '#1E40AF' },
  prevCard: { backgroundColor: '#fff', borderRadius: 20, borderWidth: 1.5, borderColor: '#0E9F8E', overflow: 'hidden', marginBottom: 12 },
  prevHeader: { backgroundColor: '#0D1B2A', padding: 16 },
  prevHeaderTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  prevHeaderSub: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  prevBody: { padding: 16 },
  prevText: { fontSize: 13, lineHeight: 22, color: '#374151', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  saveBtn: { backgroundColor: '#0E9F8E', borderRadius: 14, padding: 14, alignItems: 'center' as const, marginBottom: 8 },
  saveBtnDone: { backgroundColor: '#D1FAE5' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  pdfBtn: { backgroundColor: '#0D1B2A', borderRadius: 14, padding: 14, alignItems: 'center' as const, marginTop: 4 },
  pdfBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  recapCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1.5, borderColor: '#0E9F8E', overflow: 'hidden', marginBottom: 16 },
  recapHeader: { backgroundColor: '#F0FDF4', padding: 14, borderBottomWidth: 1, borderBottomColor: '#D1FAE5' },
  recapHeaderTitle: { fontSize: 15, fontWeight: '600', color: '#065F46' },
  recapHeaderSub: { fontSize: 12, color: '#0E9F8E', marginTop: 2 },
  recapText: { fontSize: 13, color: '#374151', lineHeight: 20, padding: 14, fontFamily: 'monospace' },
  recapActions: { flexDirection: 'row', gap: 10, padding: 14, paddingTop: 0 },
  recapConfirmBtn: { flex: 1, backgroundColor: '#0D1B2A', borderRadius: 12, padding: 12, alignItems: 'center' as const },
  recapConfirmText: { color: '#fff', fontSize: 14, fontWeight: '600' as const },
  recapEditBtn: { flex: 1, backgroundColor: '#F7F8FA', borderRadius: 12, padding: 12, alignItems: 'center' as const, borderWidth: 1, borderColor: '#E5E7EB' },
  recapEditText: { color: '#374151', fontSize: 14, fontWeight: '500' as const },
  paymentCard: { backgroundColor: '#F7F8FA', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 12, margin: 14, marginTop: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  paymentIcon: { fontSize: 20 },
  paymentLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '700', textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  paymentValue: { fontSize: 14, color: '#0D1B2A', fontWeight: '500' },
  paymentArrow: { fontSize: 20, color: '#9CA3AF' },
  paymentOption: { backgroundColor: '#F7F8FA', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  paymentOptionActive: { borderColor: '#0E9F8E', backgroundColor: '#F0FDF4' },
  paymentOptionText: { fontSize: 14, color: '#0D1B2A', fontWeight: '600' },
  paymentOptionSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  paymentCheck: { color: '#0E9F8E', fontSize: 16, fontWeight: '700' },
  clienteRilevatoBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#EBF3FF', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#BFDBFE' },
  clienteRilevatoBadgeText: { fontSize: 13, color: '#1E40AF', fontWeight: '500' },
  clienteRilevatoBadgeRemove: { fontSize: 16, color: '#9CA3AF', padding: 4 },
  clienteModalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  clienteModalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 12 },
  clienteModalTitolo: { fontSize: 16, fontWeight: '700', color: '#0D1B2A' },
  clienteModalSub: { fontSize: 13, color: '#6B7280', marginTop: -4 },
  clienteModalOption: { backgroundColor: '#F7F8FA', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  clienteModalOptionNome: { fontSize: 14, fontWeight: '600', color: '#0D1B2A' },
  clienteModalOptionInfo: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  clienteModalBtn: { backgroundColor: '#0D1B2A', borderRadius: 12, padding: 14, alignItems: 'center' as const },
  clienteModalBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' as const },
  clienteModalSkip: { alignItems: 'center' as const, padding: 8 },
  clienteModalSkipText: { fontSize: 13, color: '#9CA3AF' },
  clienteModalInput: { backgroundColor: '#F7F8FA', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 12, fontSize: 14, color: '#0D1B2A' },
})
