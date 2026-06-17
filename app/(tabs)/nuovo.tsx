import { router, useLocalSearchParams, useNavigation } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { cercaCliente, creaClienteDaChat, inviaMessaggio } from '../../lib/api/chat'
import { convertiRecap } from '../../lib/api/pdf'
import { MetodoPagamento } from '../../lib/api/preventivoPdf'
import { caricaBozzaChat, caricaMetodiPagamentoNuovo, salvaBozzaChat, salvaPreventivoNuovo, tokenNuovo } from '../../lib/api/nuovo'
import { NuovoChatView } from '../../lib/components/nuovo/NuovoChatView'
import { NuovoClienteBadge } from '../../lib/components/nuovo/NuovoClienteBadge'
import { NuovoClienteModal } from '../../lib/components/nuovo/NuovoClienteModal'
import { NuovoHeader } from '../../lib/components/nuovo/NuovoHeader'
import { NuovoPagamentoModal } from '../../lib/components/nuovo/NuovoPagamentoModal'
import { NuovoPreventivoView } from '../../lib/components/nuovo/NuovoPreventivoView'
import { NuovoRecapView } from '../../lib/components/nuovo/NuovoRecapView'
import { NuovoSceltaModalita } from '../../lib/components/nuovo/NuovoSceltaModalita'
import { nuovoStyles as styles } from '../../lib/components/nuovo/nuovoStyles'
import { applicaRispostaChat, estraiNomeCliente, importoDaPreventivo } from '../../lib/features/nuovo/chat'
import { parametriPDF } from '../../lib/features/nuovo/pdf'
import { ClienteRilevato, ClienteSuggerito, DatiClienteNuovo, NuovoParams } from '../../lib/features/nuovo/types'
import { Messaggio } from '../../lib/types'
import { trackEvento } from '../../lib/utils/analytics'
import { errorMessage } from '../../lib/utils/errors'

export default function Nuovo() {
  const params = useLocalSearchParams<NuovoParams>()
  const navigation = useNavigation()

  const [input, setInput] = useState('')
  const [messaggi, setMessaggi] = useState<Messaggio[]>([])
  const [loading, setLoading] = useState(false)
  const [token, setToken] = useState('')
  const [recap, setRecap] = useState('')
  const [preventivo, setPreventivo] = useState('')
  const [salvato, setSalvato] = useState(false)
  const [modalitaScelta, setModalitaScelta] = useState(true)
  const [metodiPagamento, setMetodiPagamento] = useState<MetodoPagamento[]>([])
  const [metodoPagamentoSelezionato, setMetodoPagamentoSelezionato] = useState<MetodoPagamento | null>(null)
  const [mostraModalPagamento, setMostraModalPagamento] = useState(false)

  const [clienteIdAttivo, setClienteIdAttivo] = useState('')
  const [clienteRilevato, setClienteRilevato] = useState<ClienteRilevato | null>(null)
  const [clientiSuggeriti, setClientiSuggeriti] = useState<ClienteSuggerito[]>([])
  const [mostraModalCliente, setMostraModalCliente] = useState(false)
  const [nomeClienteNuovo, setNomeClienteNuovo] = useState('')
  const [datiClienteNuovo, setDatiClienteNuovo] = useState<DatiClienteNuovo>({ telefono: '', email: '', indirizzo: '' })
  const [mostraFormDatiCliente, setMostraFormDatiCliente] = useState(false)

  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    trackEvento('chat_aperta', 'chat')
    tokenNuovo().then(setToken)
    caricaMetodiPagamento()
  }, [])

  async function caricaMetodiPagamento() {
    const data = await caricaMetodiPagamentoNuovo()
    const metodi = data as MetodoPagamento[]
    setMetodiPagamento(metodi)
    const predefinito = metodi.find(m => m.predefinito)
    if (predefinito) setMetodoPagamentoSelezionato(predefinito)
  }

  function pdfParams(testo: string) {
    return parametriPDF({
      testo,
      versionePadreId: params.versione_padre_id || '',
      clienteId: clienteIdAttivo || params.cliente_id || '',
      metodoPagamento: metodoPagamentoSelezionato,
    })
  }

  useEffect(() => {
    if (params.cliente_id) {
      setClienteIdAttivo(params.cliente_id)
      if (params.cliente_nome) setClienteRilevato({ id: params.cliente_id, nome: params.cliente_nome })
    }
  }, [params.cliente_id])

  useEffect(() => {
    if (params.trascrizione && messaggi.length === 0) {
      setModalitaScelta(false)
      setInput(params.trascrizione)
    }
  }, [params.trascrizione])

  useEffect(() => {
    if (params.testo_modifica && messaggi.length === 0) {
      setModalitaScelta(false)
      setMessaggi([{
        role: 'assistant',
        content: `Ho caricato il tuo preventivo v${parseInt(params.versione_numero || '2') - 1}. Cosa vuoi modificare?\n\n${params.testo_modifica}`
      }])
    }
  }, [params.testo_modifica])

  useEffect(() => {
    if (params.preventivo_id) {
      caricaBozzaChat(params.preventivo_id).then(data => {
        if (data?.messaggi_chat) setMessaggi(data.messaggi_chat as Messaggio[])
        if (data?.testo_preventivo) setPreventivo(data.testo_preventivo)
      })
    }
  }, [params.preventivo_id])

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: { preventDefault: () => void; data: { action: unknown } }) => {
      if (messaggi.length === 0 && !recap) return
      if (preventivo) return
      e.preventDefault()
      Alert.alert('Salva bozza', 'Vuoi salvare la conversazione come bozza prima di uscire?', [
        { text: 'Abbandona', style: 'destructive', onPress: () => navigation.dispatch(e.data.action as never) },
        { text: 'Continua', style: 'cancel' },
        { text: 'Salva bozza', onPress: async () => {
          await salvaBozzaChat({
            testo: recap || messaggi.filter(m => m.role === 'assistant').pop()?.content || '',
            messaggi,
            titolo: 'Bozza — ' + new Date().toLocaleDateString('it-IT')
          })
          navigation.dispatch(e.data.action as never)
        }}
      ])
    })
    return unsubscribe
  }, [messaggi, recap, preventivo, navigation])

  async function gestisciClienteDaRisposta(nome: string) {
    try {
      const risultati = await cercaCliente(nome, token) as ClienteSuggerito[]
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

  async function invia(testoForzato?: string) {
    const testo = (testoForzato || input).trim()
    if (!testo || loading) return
    if (!testoForzato) setInput('')
    setLoading(true)

    const nuovi: Messaggio[] = [...messaggi, { role: 'user', content: testo }]
    setMessaggi(nuovi)

    try {
      let reply = await inviaMessaggio(nuovi, token, clienteIdAttivo)

      if (reply.includes('CLIENTE:') && !clienteIdAttivo) {
        const estratto = estraiNomeCliente(reply)
        reply = estratto.reply
        if (estratto.nomeCliente) await gestisciClienteDaRisposta(estratto.nomeCliente)
      }

      const risultato = applicaRispostaChat(reply, nuovi)
      setMessaggi(risultato.messaggi)
      setPreventivo(risultato.preventivo)
      setRecap(risultato.recap)
    } catch (e: unknown) {
      Alert.alert('Errore', errorMessage(e))
    } finally {
      setLoading(false)
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }

  async function salva() {
    if (!preventivo || salvato) return
    await salvaPreventivoNuovo({ testo: preventivo, importoTotale: importoDaPreventivo(preventivo) })
    setSalvato(true)
    Alert.alert('Salvato!', 'Preventivo salvato nello storico.')
  }

  async function generaDaRecap() {
    setLoading(true)
    try {
      trackEvento('preventivo_convertito', 'chat')
      const testoPreventivo = await convertiRecap(recap, token)
      setRecap('')
      router.push({
        pathname: '/screens/preventivo-pdf',
        params: pdfParams(testoPreventivo)
      })
    } catch (e: unknown) {
      Alert.alert('Errore', errorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  function ricomincia() {
    setMessaggi([])
    setPreventivo('')
    setSalvato(false)
    setInput('')
    setRecap('')
    setModalitaScelta(true)
  }

  function handleBack() {
    if (!modalitaScelta && messaggi.length === 0 && !recap && !preventivo) {
      setModalitaScelta(true)
    } else {
      router.back()
    }
  }

  const headerTitle = params.testo_modifica
    ? `Modifica v${parseInt(params.versione_numero || '2') - 1}`
    : 'Nuovo preventivo'

  const mostraScelta = modalitaScelta && !recap && !preventivo && messaggi.length === 0 && !params.testo_modifica

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <NuovoHeader
        title={headerTitle}
        showRicomincia={Boolean(preventivo)}
        onBack={handleBack}
        onRicomincia={ricomincia}
      />

      {mostraScelta ? (
        <NuovoSceltaModalita
          clienteNome={params.cliente_nome || ''}
          clienteId={clienteIdAttivo || params.cliente_id || ''}
          onScriviTu={() => setModalitaScelta(false)}
        />
      ) : recap ? (
        <NuovoRecapView
          recap={recap}
          loading={loading}
          metodoPagamento={metodoPagamentoSelezionato}
          onApriPagamento={() => setMostraModalPagamento(true)}
          onGeneraPreventivo={generaDaRecap}
          onModifica={() => { setRecap(''); setInput('') }}
        />
      ) : preventivo ? (
        <NuovoPreventivoView
          preventivo={preventivo}
          salvato={salvato}
          metodoPagamento={metodoPagamentoSelezionato}
          onSalva={salva}
          onApriPagamento={() => setMostraModalPagamento(true)}
          onGeneraPdf={() => router.push({ pathname: '/screens/preventivo-pdf', params: pdfParams(preventivo) })}
        />
      ) : (
        <NuovoChatView
          scrollRef={scrollRef}
          messaggi={messaggi}
          input={input}
          loading={loading}
          onInputChange={setInput}
          onInvia={() => invia()}
        />
      )}

      {clienteRilevato && !modalitaScelta && (
        <NuovoClienteBadge
          cliente={clienteRilevato}
          onRimuovi={() => { setClienteRilevato(null); setClienteIdAttivo('') }}
        />
      )}

      <NuovoPagamentoModal
        visible={mostraModalPagamento}
        metodiPagamento={metodiPagamento}
        metodoPagamentoSelezionato={metodoPagamentoSelezionato}
        onClose={() => setMostraModalPagamento(false)}
        onSelect={setMetodoPagamentoSelezionato}
      />

      <NuovoClienteModal
        visible={mostraModalCliente}
        clientiSuggeriti={clientiSuggeriti}
        nomeClienteNuovo={nomeClienteNuovo}
        datiClienteNuovo={datiClienteNuovo}
        mostraFormDatiCliente={mostraFormDatiCliente}
        onClose={() => setMostraModalCliente(false)}
        onSelectCliente={(c) => {
          setClienteIdAttivo(c.id)
          setClienteRilevato(c)
          setMostraModalCliente(false)
        }}
        onMostraFormDati={() => setMostraFormDatiCliente(true)}
        onNascondiFormDati={() => setMostraFormDatiCliente(false)}
        onDatiClienteChange={setDatiClienteNuovo}
        onCreaCliente={creaClienteNuovo}
      />
    </KeyboardAvoidingView>
  )
}
