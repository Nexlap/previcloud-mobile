import Constants from 'expo-constants'
import { router, useLocalSearchParams, useNavigation } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native'
import { supabase } from '../../lib/supabase'

interface Messaggio {
  role: 'user' | 'assistant'
  content: string
}

export default function Nuovo() {
  const [input, setInput] = useState('')
  const [messaggi, setMessaggi] = useState<Messaggio[]>([])
  const [loading, setLoading] = useState(false)
  const [preventivo, setPreventivo] = useState('')
  const [salvato, setSalvato] = useState(false)
  const [token, setToken] = useState('')
  const [recap, setRecap] = useState('')
  const [modalitaScelta, setModalitaScelta] = useState(true)
  const [clienteRilevato, setClienteRilevato] = useState<{id: string, nome: string} | null>(null)
  const [mostraModalCliente, setMostraModalCliente] = useState(false)
  const [clientiSuggeriti, setClientiSuggeriti] = useState<{id: string, nome: string, telefono: string | null, email: string | null}[]>([])
  const [nomeClienteNuovo, setNomeClienteNuovo] = useState('')
  const [datiClienteNuovo, setDatiClienteNuovo] = useState({ telefono: '', email: '', indirizzo: '' })
  const [mostraFormDatiCliente, setMostraFormDatiCliente] = useState(false)
  const [clienteIdAttivo, setClienteIdAttivo] = useState('')
  const scrollRef = useRef<ScrollView>(null)
  const backendUrl = Constants.expoConfig?.extra?.backendUrl
  const navigation = useNavigation()

  const { trascrizione: trascrizioneParam, trascrizioneId: trascrizioneIdParam, preventivo_id, testo_modifica, versione_padre_id, versione_numero, cliente_id, cliente_nome } = useLocalSearchParams<{
    trascrizione: string
    trascrizioneId: string
    preventivo_id: string
    testo_modifica: string
    versione_padre_id: string
    versione_numero: string
    cliente_id: string
    cliente_nome: string
  }>()

  useEffect(() => {
    if (cliente_id) setClienteIdAttivo(cliente_id)
  }, [cliente_id])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/(auth)/login'); return }
      setToken(session.access_token)
    })
  }, [])

  useEffect(() => {
    if (trascrizioneParam && messaggi.length === 0) {
      setModalitaScelta(false)
      setInput(trascrizioneParam)
    }
  }, [trascrizioneParam])

  useEffect(() => {
    if (testo_modifica && messaggi.length === 0) {
      setModalitaScelta(false)
      // Inizializza la chat con il preventivo esistente come contesto
      const msgIniziale: Messaggio = {
        role: 'assistant',
        content: `Ho caricato il tuo preventivo v${parseInt(versione_numero || '2') - 1}. Cosa vuoi modificare?

${testo_modifica}`
      }
      setMessaggi([msgIniziale])
    }
  }, [testo_modifica])

  useEffect(() => {
    if (preventivo_id) {
      supabase.from('preventivi')
        .select('testo_preventivo, messaggi_chat')
        .eq('id', preventivo_id)
        .single()
        .then(({ data }) => {
          if (data?.messaggi_chat) setMessaggi(data.messaggi_chat)
          if (data?.testo_preventivo) setPreventivo(data.testo_preventivo)
        })
    }
  }, [preventivo_id])

  useEffect(() => {
const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
  if (messaggi.length === 0 && !recap) return
  if (preventivo) return
      Alert.alert(
        'Salva bozza',
        'Vuoi salvare la conversazione come bozza prima di uscire?',
        [
          { text: 'Abbandona', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
          { text: 'Continua', style: 'cancel' },
          {
            text: 'Salva bozza', onPress: async () => {
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
            }
          }
        ]
      )
    })
    return unsubscribe
  }, [messaggi, recap])



  async function gestisciClienteDaRisposta(nome: string) {
    try {
      const res = await fetch(`${backendUrl}/api/cerca-cliente`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ nome })
      })
      const data = await res.json()
      if (data.risultati && data.risultati.length === 1) {
        setClienteIdAttivo(data.risultati[0].id)
        setClienteRilevato(data.risultati[0])
      } else if (data.risultati && data.risultati.length > 1) {
        setClientiSuggeriti(data.risultati)
        setMostraModalCliente(true)
      } else {
        setNomeClienteNuovo(nome)
        setClientiSuggeriti([])
        setMostraModalCliente(true)
      }
    } catch (e) {}
  }

  async function creaClienteNuovo() {
    try {
      const res = await fetch(`${backendUrl}/api/crea-cliente-da-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ nome: nomeClienteNuovo, ...datiClienteNuovo })
      })
      const data = await res.json()
      if (data.cliente) {
        setClienteIdAttivo(data.cliente.id)
        setClienteRilevato({ id: data.cliente.id, nome: data.cliente.nome })
      }
    } catch (e) {}
    setMostraModalCliente(false)
    setMostraFormDatiCliente(false)
  }

  async function invia(testoForzato?: string) {
    const testo = (testoForzato || input).trim()
    if (!testo || loading) return
    if (!testoForzato) setInput('')
    setLoading(true)

    const nuovi: Messaggio[] = [...messaggi, { role: 'user', content: testo }]
    setMessaggi(nuovi)

    try {
      const res = await fetch(`${backendUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ messages: nuovi, cliente_id: clienteIdAttivo || '' })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      let reply: string = data.reply

      // Intercetta CLIENTE: dal reply
      if (reply.includes('CLIENTE:') && !clienteIdAttivo) {
        const clienteMatch = reply.match(/CLIENTE:([^\n]+)/)
        if (clienteMatch) {
          const nomeCliente = clienteMatch[1].trim()
          reply = reply.replace(/CLIENTE:[^\n]+\n?/, '').trim()
          await gestisciClienteDaRisposta(nomeCliente)
        }
      }

      if (reply.includes('PREVENTIVO_PRONTO')) {
        const parts = reply.split('PREVENTIVO_PRONTO')
        if (parts[0].trim()) setMessaggi([...nuovi, { role: 'assistant', content: parts[0].trim() }])
        setPreventivo(parts[1].trim())
        setRecap('')
      } else if (reply.includes('RECAP_PRONTO')) {
        const parts = reply.split('RECAP_PRONTO')
        if (parts[0].trim()) setMessaggi([...nuovi, { role: 'assistant', content: parts[0].trim() }])
        setRecap(parts[1].trim())
      } else {
        setMessaggi([...nuovi, { role: 'assistant', content: reply }])
      }
    } catch (e: any) {
      Alert.alert('Errore', e.message)
    }
    setLoading(false)
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
  }

  async function salva() {
    if (!preventivo || salvato) return
    const match = preventivo.match(/TOTALE[:\s]*€?\s*([\d.,]+)/i)
    const importo = match ? parseFloat(match[1].replace(',', '.')) : null
    await fetch(`${backendUrl}/api/salva-preventivo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        testo_preventivo: preventivo,
        importo_totale: importo,
        messaggio_cliente: messaggi[0]?.content || ''
      })
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

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (!modalitaScelta && messaggi.length === 0 && !recap && !preventivo) {
              setModalitaScelta(true)
            } else {
              router.back()
            }
          }}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nuovo preventivo</Text>
        {preventivo ? (
          <TouchableOpacity onPress={ricomincia}>
            <Text style={styles.nuovoText}>Nuovo</Text>
          </TouchableOpacity>
        ) : <View style={{ width: 50 }} />}
      </View>

      {modalitaScelta && !recap && !preventivo && messaggi.length === 0 && !testo_modifica ? (
        <View style={styles.sceltaContainer}>
          <Text style={styles.sceltaTitolo}>Come vuoi iniziare?</Text>
          <Text style={styles.sceltaSub}>Scegli il metodo più comodo per te</Text>
          {cliente_nome ? (
            <View style={styles.clienteBadge}>
              <Text style={styles.clienteBadgeText}>👤 Preventivo per: <Text style={{ fontWeight: '700' }}>{cliente_nome}</Text></Text>
            </View>
          ) : null}

          <TouchableOpacity style={styles.sceltaCard} onPress={() => router.push('/(tabs)/registra')}>
            <Text style={styles.sceltaCardIcon}>🎙</Text>
            <View style={styles.sceltaCardBody}>
              <Text style={styles.sceltaCardTitle}>Registra voce</Text>
              <Text style={styles.sceltaCardSub}>Parla del lavoro, trascrivo e genero automaticamente</Text>
            </View>
            <Text style={styles.sceltaCardArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sceltaCard} onPress={() => setModalitaScelta(false)}>
            <Text style={styles.sceltaCardIcon}>✍️</Text>
            <View style={styles.sceltaCardBody}>
              <Text style={styles.sceltaCardTitle}>Scrivi tu</Text>
              <Text style={styles.sceltaCardSub}>Descrivi il lavoro a testo, l'AI fa le domande giuste</Text>
            </View>
            <Text style={styles.sceltaCardArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sceltaCard} onPress={() => router.push('/(tabs)/builder')}>
            <Text style={styles.sceltaCardIcon}>📋</Text>
            <View style={styles.sceltaCardBody}>
              <Text style={styles.sceltaCardTitle}>Builder manuale</Text>
              <Text style={styles.sceltaCardSub}>Seleziona i servizi dal listino e assembla</Text>
            </View>
            <Text style={styles.sceltaCardArrow}>›</Text>
          </TouchableOpacity>
        </View>

      ) : recap ? (
        <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16 }}>
          <View style={styles.recapCard}>
            <View style={styles.recapHeader}>
              <Text style={styles.recapHeaderTitle}>📋 Riepilogo lavoro</Text>
              <Text style={styles.recapHeaderSub}>Conferma o modifica prima di generare</Text>
            </View>
            <Text style={styles.recapText}>{recap}</Text>
            <View style={styles.recapActions}>
              <TouchableOpacity
                style={styles.recapConfirmBtn}
                onPress={async () => {
                  setLoading(true)
                  try {
                    const res = await fetch(`${backendUrl}/api/converti-recap`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                      body: JSON.stringify({ recap })
                    })
                    const data = await res.json()
                    if (data.error) throw new Error(data.error)
                    setRecap('')
                    router.push({
                      pathname: '/(tabs)/preventivo-pdf',
                      params: { testo: data.preventivo, versione_padre_id: versione_padre_id || '', cliente_id: cliente_id || '' }
                    })
                  } catch (e: any) {
                    Alert.alert('Errore', e.message)
                  }
                  setLoading(false)
                }}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.recapConfirmText}>✓ Genera preventivo</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.recapEditBtn}
                onPress={() => {
                  setRecap('')
                  setInput('')
                }}
              >
                <Text style={styles.recapEditText}>✏️ Modifica</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

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
          <TouchableOpacity
            style={[styles.saveBtn, salvato && styles.saveBtnDone]}
            onPress={salva}
            disabled={salvato}
          >
            <Text style={styles.saveBtnText}>
              {salvato ? '✓ Salvato nello storico' : 'Salva nello storico'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.pdfBtn}
            onPress={() => router.push({
              pathname: '/(tabs)/preventivo-pdf',
              params: { testo: preventivo, versione_padre_id: versione_padre_id || '' }
            })}
          >
            <Text style={styles.pdfBtnText}>📄 Genera PDF professionale</Text>
          </TouchableOpacity>
        </ScrollView>

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
          <Text style={styles.clienteRilevatoBadgeText}>👤 {clienteRilevato.nome}</Text>
          <TouchableOpacity onPress={() => { setClienteRilevato(null); setClienteIdAttivo('') }}>
            <Text style={styles.clienteRilevatoBadgeRemove}>✕</Text>
          </TouchableOpacity>
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
                    <TextInput style={styles.clienteModalInput} placeholder="Telefono" placeholderTextColor="#9CA3AF"
                      value={datiClienteNuovo.telefono} onChangeText={v => setDatiClienteNuovo(d => ({...d, telefono: v}))} keyboardType="phone-pad" />
                    <TextInput style={styles.clienteModalInput} placeholder="Email" placeholderTextColor="#9CA3AF"
                      value={datiClienteNuovo.email} onChangeText={v => setDatiClienteNuovo(d => ({...d, email: v}))} keyboardType="email-address" autoCapitalize="none" />
                    <TextInput style={styles.clienteModalInput} placeholder="Indirizzo" placeholderTextColor="#9CA3AF"
                      value={datiClienteNuovo.indirizzo} onChangeText={v => setDatiClienteNuovo(d => ({...d, indirizzo: v}))} />
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
  riprendiBtn: { backgroundColor: '#0E9F8E', borderRadius: 10, padding: 10, alignItems: 'center' as const, marginBottom: 8 },
  riprendiBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' as const },
  sceltaContainer: { flex: 1, padding: 20, gap: 14 },
  sceltaTitolo: { fontSize: 24, fontWeight: '700', color: '#0D1B2A', marginTop: 8 },
  sceltaSub: { fontSize: 14, color: '#9CA3AF', marginBottom: 8 },
  sceltaCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  sceltaCardDisabled: { opacity: 0.5 },
  sceltaCardIcon: { fontSize: 28 },
  sceltaCardBody: { flex: 1, gap: 3 },
  sceltaCardTitle: { fontSize: 16, fontWeight: '600', color: '#0D1B2A' },
  sceltaCardSub: { fontSize: 12, color: '#9CA3AF', lineHeight: 17 },
  sceltaCardArrow: { fontSize: 22, color: '#9CA3AF' },
  sceltaCardBadge: { fontSize: 11, color: '#0E9F8E', fontWeight: '600' as const, backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
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
  clienteBadge: { backgroundColor: '#EBF3FF', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#BFDBFE' },
  clienteBadgeText: { fontSize: 13, color: '#1E40AF' },
})