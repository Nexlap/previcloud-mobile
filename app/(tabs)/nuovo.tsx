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
import { applicaRispostaChat, estraiNomeCliente, importoDaPreventivo } from '../../lib/features/nuovo/chat'
import { parametriPDF } from '../../lib/features/nuovo/pdf'
import { parsePreventivoTesto, trovaMetodoPagamentoDaNome } from '../../lib/builder/parsePreventivoText'
import { risolviModifica } from '../../lib/features/modificaPreventivo/modificaSession'
import { ClienteRilevato, ClienteSuggerito, DatiClienteNuovo, NuovoParams } from '../../lib/features/nuovo/types'
import { Messaggio } from '../../lib/types'
import { trackEvento } from '../../lib/utils/analytics'
import { errorMessage } from '../../lib/utils/errors'
import { useScreenTheme } from '../../lib/hooks/useScreenTheme'

export default function Nuovo() {
  const { s } = useScreenTheme()
  const params = useLocalSearchParams<NuovoParams>()
  const modifica = risolviModifica(params)
  const testoModifica = modifica?.testoPreventivo || ''
  const versionePrecedente = (modifica?.versioneNumero || parseInt(params.versione_numero || '2', 10)) - 1
  const inModifica = Boolean(testoModifica)
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
  const modificaInizializzata = useRef(false)
  const trascrizioneModificaInviata = useRef(false)

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
    if (predefinito && !inModifica) setMetodoPagamentoSelezionato(predefinito)
  }

  function pdfParams(testo: string) {
    return parametriPDF({
      testo,
      versionePadreId: modifica?.versionePadreId || params.versione_padre_id || '',
      clienteId: clienteIdAttivo || modifica?.clienteId || params.cliente_id || '',
      metodoPagamento: metodoPagamentoSelezionato,
    })
  }

  useEffect(() => {
    const clienteId = modifica?.clienteId || params.cliente_id
    const clienteNome = modifica?.clienteNome || params.cliente_nome
    if (clienteId) {
      setClienteIdAttivo(clienteId)
      if (clienteNome) setClienteRilevato({ id: clienteId, nome: clienteNome })
    }
  }, [params.cliente_id, params.cliente_nome, modifica?.clienteId, modifica?.clienteNome])

  useEffect(() => {
    if (params.trascrizione && !inModifica && messaggi.length === 0) {
      setModalitaScelta(false)
      setInput(params.trascrizione)
    }
  }, [params.trascrizione, inModifica, messaggi.length])

  useEffect(() => {
    modificaInizializzata.current = false
    trascrizioneModificaInviata.current = false
  }, [params.modifica, params.trascrizione, testoModifica])

  useEffect(() => {
    if (!testoModifica || modificaInizializzata.current) return
    modificaInizializzata.current = true
    setModalitaScelta(false)
    setMessaggi([{
      role: 'assistant',
      content: `Ho caricato il tuo preventivo v${versionePrecedente}. Cosa vuoi modificare?\n\n${testoModifica}`
    }])
  }, [testoModifica, versionePrecedente])

  useEffect(() => {
    if (!testoModifica || metodiPagamento.length === 0) return
    const parsed = parsePreventivoTesto(testoModifica)
    const trovato = trovaMetodoPagamentoDaNome(metodiPagamento, parsed.pagamentoNome)
    if (trovato) setMetodoPagamentoSelezionato(trovato)
  }, [testoModifica, metodiPagamento])

  useEffect(() => {
    if (!params.trascrizione || !inModifica || trascrizioneModificaInviata.current) return
    if (!token || messaggi.length === 0) return
    trascrizioneModificaInviata.current = true
    invia(params.trascrizione)
  }, [params.trascrizione, inModifica, token, messaggi.length])

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
    } catch (e: unknown) {
      console.error('[nuovo] gestisciClienteDaRisposta:', e)
      Alert.alert('Errore', 'Impossibile creare il cliente, riprova.')
    }
  }

  async function creaClienteNuovo() {
    try {
      const cliente = await creaClienteDaChat({ nome: nomeClienteNuovo, ...datiClienteNuovo }, token)
      if (!cliente) {
        Alert.alert('Errore', 'Impossibile creare il cliente, riprova.')
        return
      }
      setClienteIdAttivo(cliente.id)
      setClienteRilevato({ id: cliente.id, nome: cliente.nome })
      setMostraModalCliente(false)
      setMostraFormDatiCliente(false)
    } catch (e: unknown) {
      console.error('[nuovo] creaClienteNuovo:', e)
      Alert.alert('Errore', 'Impossibile creare il cliente, riprova.')
    }
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

      if (inModifica) {
        if (risultato.recap) {
          trackEvento('preventivo_convertito', 'chat')
          const testoPreventivo = await convertiRecap(risultato.recap, token)
          await vaiAnteprimaPdf(testoPreventivo)
          return
        }
        if (risultato.preventivo) {
          await vaiAnteprimaPdf(risultato.preventivo)
          return
        }
      }

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

  async function vaiAnteprimaPdf(testo: string) {
    router.push({
      pathname: '/screens/preventivo-pdf',
      params: pdfParams(testo),
    })
  }

  async function generaDaRecap() {
    setLoading(true)
    try {
      trackEvento('preventivo_convertito', 'chat')
      const testoPreventivo = await convertiRecap(recap, token)
      setRecap('')
      await vaiAnteprimaPdf(testoPreventivo)
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

  const headerTitle = inModifica
    ? `Modifica v${versionePrecedente}`
    : 'Nuovo preventivo'

  const mostraScelta = modalitaScelta && !recap && !preventivo && messaggi.length === 0 && !inModifica

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
          onGeneraPdf={() => vaiAnteprimaPdf(preventivo)}
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
