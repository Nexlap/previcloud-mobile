import * as FileSystem from 'expo-file-system/legacy'
import { router, useLocalSearchParams, useNavigation } from 'expo-router'
import * as Sharing from 'expo-sharing'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { EventArg, NavigationAction } from '@react-navigation/native'
import {
  ActivityIndicator, Alert, BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  RefreshControl, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View
} from 'react-native'
import { MESI_BREVI } from '../../lib/constants'
import { creaLinkPagamentoRata } from '../../lib/api/pdf'
import { aggiornaClienteDettaglio, caricaClienteDettaglio, caricaClientiDisponibili as caricaClientiDisponibiliData, caricaCollegamentiPianoPreventivo, caricaCronologiaCliente, eliminaClienteDettaglio, eliminaPreventiviCliente, sessioneClienteDettaglio, spostaPreventiviCliente } from '../../lib/api/clienteDettaglio'
import { ripristinaVersionePreventivo } from '../../lib/api/storico'
import { caricaContattiCliente } from '../../lib/api/firma'
import { useInviiFirma } from '../../lib/hooks/useInviiFirma'
import { caricaSettingsData } from '../../lib/api/settings'
import { eventBus } from '../../lib/eventBus'
import { useAbbonamento } from '../../lib/hooks/useAbbonamento'
import { useAnnullaSelezioneOnAndroidBack } from '../../lib/hooks/useAnnullaSelezioneOnAndroidBack'
import { usePreventivi } from '../../lib/hooks/usePreventivi'
import { Cliente, Preventivo, RataAbbonamento, Trascrizione } from '../../lib/types'
import { formatImportoEuro } from '../../lib/utils/importo'
import { trackEvento } from '../../lib/utils/analytics'
import { errorMessage } from '../../lib/utils/errors'
import { ModificaPreventivoModal } from '../../lib/components/modificaPreventivo/ModificaPreventivoModal'
import { useModificaPreventivoScelta } from '../../lib/features/modificaPreventivo/useModificaPreventivoScelta'
import { ClienteAbbonamentoTab } from '../../lib/components/clienteDettaglio/ClienteAbbonamentoTab'
import { ClienteAbbonamentoModals } from '../../lib/components/clienteDettaglio/ClienteAbbonamentoModals'
import { MenuAzioniSheet } from '../../lib/components/MenuAzioniSheet'
import {
  ClienteDettaglioHeader,
  ClienteInfoCard,
  ClienteStats,
  ClienteTabs,
} from '../../lib/components/clienteDettaglio/ClienteOverview'
import { ClientePreventivoModals } from '../../lib/components/clienteDettaglio/ClientePreventivoModals'
import { ClientePreventiviList } from '../../lib/components/clienteDettaglio/ClientePreventiviList'
import { InviaFirmaModal } from '../../lib/components/firma/InviaFirmaModal'
import { FirmaDettaglioModal } from '../../lib/components/firma/FirmaDettaglioModal'
import { ClientePagamentoRateTab } from '../../lib/components/clienteDettaglio/ClientePagamentoRateTab'

type BeforeRemoveEvent = EventArg<'beforeRemove', true, { action: NavigationAction }>

export default function ClienteDettaglio() {
  const { id, nome, tab: tabIniziale } = useLocalSearchParams<{ id: string, nome: string, tab?: string }>()
  const navigation = useNavigation()
  const { modificaInput, apriDaPreventivo, chiudiSceltaModifica } = useModificaPreventivoScelta()

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [trascrizioni, setTrascrizioni] = useState<Trascrizione[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tab, setTab] = useState<'preventivi' | 'pagamento_rate' | 'abbonamento'>('preventivi')
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
  const scrollRef = useRef<ScrollView>(null)
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const showSub = Keyboard.addListener(showEvent, e => setKeyboardHeight(e.endCoordinates.height))
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0))
    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [])

  function scrollCampoInVista() {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), Platform.OS === 'ios' ? 100 : 250)
  }

  // Abbonamento
  const [mostraModalNuovoAb, setMostraModalNuovoAb] = useState(false)
  const [mostraModalNuovoRate, setMostraModalNuovoRate] = useState(false)
  const [mostraModalModificaAb, setMostraModalModificaAb] = useState(false)
  const [preventivoSelezionatoId, setPreventivoSelezionatoId] = useState<string | null>(null)
  const [preventivoRateSelezionatoId, setPreventivoRateSelezionatoId] = useState<string | null>(null)
  const [abImporto, setAbImporto] = useState('')
  const [abGiorno, setAbGiorno] = useState('1')
  const [abMensilita, setAbMensilita] = useState('')
  const [rateImportoTotale, setRateImportoTotale] = useState('')
  const [rateNumero, setRateNumero] = useState('')
  const [rateGiorno, setRateGiorno] = useState('')
  const [rateMeseInizio, setRateMeseInizio] = useState('')
  const [rataSelezionata, setRataSelezionata] = useState<RataAbbonamento | null>(null)
  const [pagamentoImporto, setPagamentoImporto] = useState('')
  const [pagamentoNota, setPagamentoNota] = useState('')
  const [invioReminderLoading, setInvioReminderLoading] = useState<string | null>(null)
  const [pianoEspansoId, setPianoEspansoId] = useState<string | null>(null)
  const [abbonamentoSelezionatoId, setAbbonamentoSelezionatoId] = useState<string | null>(null)
  const [rataMiniAperta, setRataMiniAperta] = useState<string | null>(null)
  const [nomeAbTemp, setNomeAbTemp] = useState('')
  const [mostraModalRinominaAb, setMostraModalRinominaAb] = useState(false)
  const [rataImporto, setRataImporto] = useState('')
  const [mostraModalAggiungiRata, setMostraModalAggiungiRata] = useState(false)
  const [nuovaRataMese, setNuovaRataMese] = useState('')
  const [nuovaRataAnno, setNuovaRataAnno] = useState('')
  const [nuovaRataImporto, setNuovaRataImporto] = useState('')
  const [rateSelezioneAttiva, setRateSelezioneAttiva] = useState(false)
  const [rateSelezionate, setRateSelezionate] = useState<string[]>([])
  const [pianoSelezioneAttiva, setPianoSelezioneAttiva] = useState(false)
  const [pianiSelezionati, setPianiSelezionati] = useState<string[]>([])
  const [collegamentiPiano, setCollegamentiPiano] = useState<Record<string, 'canone' | 'rate'>>({})
  const [firmaModalPreventivo, setFirmaModalPreventivo] = useState<Preventivo | null>(null)
  const [firmaDettaglioPreventivo, setFirmaDettaglioPreventivo] = useState<Preventivo | null>(null)
  const [nomeAzienda, setNomeAzienda] = useState('')

  const {
    preventivi, totaleValore,
    cambiaStato, segnaPagato, eliminaPreventivo: eliminaPrev, rinominaPreventivo, spostaPreventivo,
    onRefresh: onRefreshPreventivi, patchPreventivoLocal,
  } = usePreventivi({ clienteId: id })

  const preventivoModale = modalStato ? preventivi.find(p => p.id === modalStato) : null
  const idsInviiFirma = preventivi.map(p => p.id)

  const { inviiFirma, ricaricaInviiFirma } = useInviiFirma(idsInviiFirma, {
    onPreventivoChange: (row) => {
      patchPreventivoLocal(row.id, { stato: row.stato, pdf_url: row.pdf_url ?? undefined })
    },
  })

  const {
    abbonamentiAttivi, preventiviMadreStorico, ratePerPiano, loading: loadingAb,
    creaAbbonamento, aggiornaAbbonamento, eliminaAbbonamento,
    registraPagamento, azzeraPagamento,
    aggiungiRataMese, eliminaRate, rinominaAbbonamento, modificaImportoRata,
    totaleIncassato, totaleParziale, carica: caricaAb
  } = useAbbonamento(id, { soloTipo: 'canone' })

  const {
    creaPianoRate,
    eliminaAbbonamento: eliminaPianoRate,
    rinominaAbbonamento: rinominaPianoRate,
    carica: caricaAbRate,
  } = useAbbonamento(id, { soloTipo: 'rate' })

  const preventiviSenzaPiano = useMemo(
    () => preventivi.filter(p => p.is_ultimo && !collegamentiPiano[p.id]),
    [preventivi, collegamentiPiano],
  )

  useEffect(() => {
    trackEvento('cliente_dettaglio_aperto', 'cliente-dettaglio')
    carica()
  }, [])

  useEffect(() => {
    if (tabIniziale === 'preventivi' || tabIniziale === 'pagamento_rate' || tabIniziale === 'abbonamento') {
      setTab(tabIniziale)
    }
  }, [tabIniziale])

  useEffect(() => {
    setPianoSelezioneAttiva(false)
    setPianiSelezionati([])
    setRateSelezioneAttiva(false)
    setRateSelezionate([])
  }, [tab])

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: BeforeRemoveEvent) => {
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
    const [{ cliente, trascrizioni }, collegamenti, settings] = await Promise.all([
      caricaClienteDettaglio(id),
      caricaCollegamentiPianoPreventivo(id),
      caricaSettingsData(),
    ])
    if (cliente) setCliente(cliente)
    setTrascrizioni(trascrizioni)
    setCollegamentiPiano(collegamenti)
    if (settings?.form?.nome_azienda) {
      setNomeAzienda(settings.form.nome_azienda.split(' ')[0] || settings.form.nome_azienda)
    }
    setLoading(false)
  }

  async function onRefresh() {
    setRefreshing(true)
    await Promise.all([carica(), onRefreshPreventivi(), caricaAb()])
    setRefreshing(false)
  }

  function apriPreventivoMadre(preventivoId: string) {
    setTab('preventivi')
    setAperto(preventivoId)
    setCronologiaAperta(null)
    setCronologiaVersioneAperta(null)
  }

  async function aggiornaCollegamentiPiano() {
    setCollegamentiPiano(await caricaCollegamentiPianoPreventivo(id))
    await onRefreshPreventivi()
    eventBus.emit('aggiorna-home')
  }

  async function eliminaAbbonamentoCliente(abbonamentoId: string) {
    await eliminaAbbonamento(abbonamentoId)
    await aggiornaCollegamentiPiano()
  }

  async function eliminaPreventivo(prevId: string) {
    Alert.alert('Elimina', 'Vuoi eliminare questo preventivo?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: () => eliminaPrev(prevId) }
    ])
  }

  async function eliminaCliente() {
    Alert.alert('Elimina cliente', 'Verranno eliminati anche preventivi, abbonamenti e rate collegati. Continuare?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: async () => {
        const { error } = await eliminaClienteDettaglio(id)
        if (error) { Alert.alert('Errore', error.message); return }
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
    await aggiornaClienteDettaglio(id, aggiornamento)
    setCliente(c => c ? { ...c, ...aggiornamento } : c)
    setMostraModalRinominaCliente(false)
    setModificheNonSalvate(false)
  }

  async function caricaClientiDisponibili() {
    const data = await caricaClientiDisponibiliData(id)
    if (data) setClientiDisponibili(data)
  }

  async function caricaCronologia(preventivoId: string, padreId: string | null) {
    if (cronologiaAperta === preventivoId) {
      setCronologiaAperta(null)
      setCronologiaVersioneAperta(null)
      return
    }
    if (!padreId) return
    const versioni = await caricaCronologiaCliente(padreId)
    if (versioni.length > 0) {
      setCronologia(c => ({ ...c, [preventivoId]: versioni }))
      setCronologiaAperta(preventivoId)
      setCronologiaVersioneAperta(null)
    }
  }

  async function onRipristinaVersione(preventivoCorrenteId: string, versione: Preventivo) {
    await ripristinaVersionePreventivo(preventivoCorrenteId, versione.id)
    Alert.alert('\u2713 Ripristinato')
    setAperto(null)
    setCronologiaAperta(null)
    setCronologiaVersioneAperta(null)
    await onRefresh()
    eventBus.emit('aggiorna-home')
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
        await eliminaPreventiviCliente(selezione)
        annullaSelezione()
      }}
    ])
  }

  async function spostaSelezionati(nuovoClienteId: string, nuovoClienteNome: string) {
    await spostaPreventiviCliente(selezione, nuovoClienteId, nuovoClienteNome)
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
      router.push({ pathname: '/screens/preventivo-pdf', params: { testo: p.testo_preventivo || '', cliente_id: p.cliente_id || '', preventivo_id: p.id } })
    }
  }

  function formatDurata(sec: number | null) {
    if (!sec) return '—'
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  function apriModalPagamento(rata: RataAbbonamento) {
    setRataSelezionata(rata)
    const residuo = rata.importo - (rata.acconto || 0)
    setPagamentoImporto(residuo.toString())
    setPagamentoNota('')
    setRataImporto(rata.importo.toString())
  }

  async function inviaReminder(rata: RataAbbonamento) {
    try {
      setInvioReminderLoading(rata.id)
      const session = await sessioneClienteDettaglio()
      if (!session) return
      const residuo = rata.importo - (rata.acconto || 0)
      const link = await creaLinkPagamentoRata(rata.id, cliente?.nome || '', session.access_token)
      const MESI_FULL = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
      const testo = `Ciao ${cliente?.nome || ''}, ti ricordo il pagamento di €${formatImportoEuro(residuo, 2)} per il canone di ${MESI_FULL[rata.mese - 1]} ${rata.anno}. Puoi pagare qui: ${link}`
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
    } catch (err: unknown) {
      Alert.alert('Errore', errorMessage(err))
    } finally {
      setInvioReminderLoading(null)
    }
  }

  async function salvaNuovoAbbonamento() {
    const importo = parseFloat(abImporto.replace(',', '.'))
    const giorno = parseInt(abGiorno)
    if (!importo || importo <= 0) { Alert.alert('Inserisci un importo valido'); return }
    if (!giorno || giorno < 1 || giorno > 31) { Alert.alert('Inserisci un giorno valido (1-31)'); return }
    const mensilita = abMensilita ? parseInt(abMensilita) : undefined
    await creaAbbonamento(importo, giorno, {
      numeroMensilita: mensilita,
      tipo: 'canone',
      preventivoId: preventivoSelezionatoId || undefined,
    })
    setMostraModalNuovoAb(false)
    await aggiornaCollegamentiPiano()
    await caricaAb()
  }

  function selezionaPreventivoAbbonamento(preventivoId: string | null) {
    setPreventivoSelezionatoId(preventivoId)
    if (!preventivoId) return
    const preventivo = preventivi.find(p => p.id === preventivoId)
    if (preventivo?.importo_totale != null) {
      setAbImporto(String(preventivo.importo_totale).replace('.', ','))
    }
  }

  function selezionaPreventivoRate(preventivoId: string | null) {
    setPreventivoRateSelezionatoId(preventivoId)
    if (!preventivoId) return
    const preventivo = preventivi.find(p => p.id === preventivoId)
    if (preventivo?.importo_totale != null) {
      setRateImportoTotale(String(preventivo.importo_totale).replace('.', ','))
    }
  }

  function apriModaleAbbonamento() {
    setPreventivoSelezionatoId(null)
    setAbImporto('')
    setAbGiorno('1')
    setAbMensilita('')
    setMostraModalNuovoAb(true)
  }

  function apriModaleRate() {
    const ora = new Date()
    setPreventivoRateSelezionatoId(null)
    setRateImportoTotale('')
    setRateNumero('')
    setRateGiorno(String(ora.getDate()))
    setRateMeseInizio(String(ora.getMonth() + 1))
    setMostraModalNuovoRate(true)
  }

  async function salvaNuovoPianoRate() {
    const importo = parseFloat(rateImportoTotale.replace(',', '.'))
    const numero = parseInt(rateNumero, 10)
    const giorno = parseInt(rateGiorno, 10)
    const mese = parseInt(rateMeseInizio, 10)
    if (!(importo > 0)) { Alert.alert('Inserisci un importo valido'); return }
    if (!(numero >= 2)) { Alert.alert('Numero rate non valido', 'Inserisci almeno 2 rate.'); return }
    if (!(giorno >= 1 && giorno <= 31)) { Alert.alert('Inserisci un giorno valido (1-31)'); return }
    if (!(mese >= 1 && mese <= 12)) { Alert.alert('Inserisci un mese valido (1-12)'); return }
    const ok = await creaPianoRate(importo, numero, {
      preventivoId: preventivoRateSelezionatoId || undefined,
      giornoScadenza: giorno,
      meseInizio: mese,
    })
    if (!ok) return
    setMostraModalNuovoRate(false)
    await aggiornaCollegamentiPiano()
    eventBus.emit('aggiorna-piano-cliente')
    await caricaAbRate()
  }

  async function salvaModificaAbbonamento() {
    if (!abbonamentoSelezionatoId) return
    const importo = parseFloat(abImporto.replace(',', '.'))
    const giorno = parseInt(abGiorno)
    if (!importo || importo <= 0) { Alert.alert('Inserisci un importo valido'); return }
    await aggiornaAbbonamento(abbonamentoSelezionatoId, importo, giorno)
    setMostraModalModificaAb(false)
  }

  async function confermaPagamentoRata() {
    if (!rataSelezionata) return
    const importo = parseFloat(pagamentoImporto.replace(',', '.'))
    if (!importo || importo <= 0) { Alert.alert('Inserisci un importo valido'); return }
    const nuovoImportoRata = parseFloat(rataImporto.replace(',', '.'))
    if (nuovoImportoRata && nuovoImportoRata !== rataSelezionata.importo) {
      await modificaImportoRata(rataSelezionata.id, nuovoImportoRata)
    }
    await registraPagamento(rataSelezionata.id, importo, pagamentoNota || undefined)
    await onRefreshPreventivi()
    eventBus.emit('aggiorna-home')
    setRataSelezionata(null)
  }

  async function salvaRinominaAbbonamento() {
    if (!abbonamentoSelezionatoId) return
    const rinomina = tab === 'pagamento_rate' ? rinominaPianoRate : rinominaAbbonamento
    await rinomina(abbonamentoSelezionatoId, nomeAbTemp)
    setMostraModalRinominaAb(false)
  }

  function apriModalAggiungiRata(abbonamentoId: string) {
    const abbonamento = abbonamentiAttivi.find(a => a.id === abbonamentoId)
    if (!abbonamento) return
    setAbbonamentoSelezionatoId(abbonamentoId)
    setNuovaRataMese(String(meseCorrente))
    setNuovaRataAnno(String(annoCorrente))
    setNuovaRataImporto(abbonamento.importo_default.toString())
    setMostraModalAggiungiRata(true)
  }

  async function confermaAggiungiRata() {
    if (!abbonamentoSelezionatoId) return
    const mese = parseInt(nuovaRataMese, 10)
    const anno = parseInt(nuovaRataAnno, 10)
    const importo = parseFloat(nuovaRataImporto.replace(',', '.'))
    if (!mese || mese < 1 || mese > 12) {
      Alert.alert('Mese non valido', 'Inserisci un mese tra 1 e 12')
      return
    }
    if (!anno || anno < 2000 || anno > 2100) {
      Alert.alert('Anno non valido', 'Inserisci un anno valido')
      return
    }
    if (!importo || importo <= 0) {
      Alert.alert('Importo non valido', 'Inserisci un importo maggiore di zero')
      return
    }
    const ok = await aggiungiRataMese(abbonamentoSelezionatoId, mese, anno, importo)
    if (ok) setMostraModalAggiungiRata(false)
  }

  async function eliminaRateSelezionate(ids: string[]) {
    const ok = await eliminaRate(ids)
    if (!ok) return
    if (rataSelezionata && ids.includes(rataSelezionata.id)) setRataSelezionata(null)
    if (rataMiniAperta && ids.includes(rataMiniAperta)) setRataMiniAperta(null)
  }

  function annullaSelezioneRate() {
    setRateSelezioneAttiva(false)
    setRateSelezionate([])
  }

  function annullaSelezionePiani() {
    setPianoSelezioneAttiva(false)
    setPianiSelezionati([])
  }

  function avviaSelezionePiano(abbonamentoId: string) {
    annullaSelezioneRate()
    setPianoSelezioneAttiva(true)
    setPianiSelezionati(ids => ids.includes(abbonamentoId) ? ids : [...ids, abbonamentoId])
  }

  function toggleSelezionePiano(abbonamentoId: string) {
    setPianiSelezionati(ids => {
      const prossimi = ids.includes(abbonamentoId) ? ids.filter(x => x !== abbonamentoId) : [...ids, abbonamentoId]
      if (prossimi.length === 0) setPianoSelezioneAttiva(false)
      return prossimi
    })
  }

  function confermaEliminaPianiSelezionati() {
    const ids = [...pianiSelezionati]
    if (!ids.length) return
    const etichetta = tab === 'pagamento_rate' ? 'piani a rate' : 'abbonamenti'
    Alert.alert(`Elimina ${etichetta}`, `Eliminare ${ids.length} ${etichetta} selezionati?`, [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: async () => {
          if (tab === 'pagamento_rate') {
            for (const pianoId of ids) await eliminaPianoRate(pianoId)
            eventBus.emit('aggiorna-piano-cliente')
          } else {
            for (const pianoId of ids) await eliminaAbbonamento(pianoId)
            await caricaAb()
          }
          await aggiornaCollegamentiPiano()
          annullaSelezionePiani()
        },
      },
    ])
  }

  function avviaSelezioneRata(rataId: string) {
    annullaSelezionePiani()
    setRateSelezioneAttiva(true)
    setRateSelezionate(ids => ids.includes(rataId) ? ids : [...ids, rataId])
  }

  function toggleSelezioneRata(rataId: string) {
    setRateSelezionate(ids => {
      const prossimi = ids.includes(rataId) ? ids.filter(x => x !== rataId) : [...ids, rataId]
      if (prossimi.length === 0) setRateSelezioneAttiva(false)
      return prossimi
    })
  }

  function confermaEliminaRateSelezionate() {
    const ids = [...rateSelezionate]
    if (!ids.length) return
    Alert.alert('Elimina rate', `Eliminare ${ids.length} rate selezionate?`, [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: async () => {
          await eliminaRateSelezionate(ids)
          annullaSelezioneRate()
        },
      },
    ])
  }

  function apriModificaCliente() {
    setNuovoNomeCliente(cliente?.nome || '')
    setNuovoTelefono(cliente?.telefono || '')
    setNuovaEmail(cliente?.email || '')
    setNuovoIndirizzo(cliente?.indirizzo || '')
    setNuoveNote(cliente?.note || '')
    setModificheNonSalvate(false)
    setMostraModalRinominaCliente(true)
  }

  useAnnullaSelezioneOnAndroidBack(modalitaSelezione, annullaSelezione)
  useAnnullaSelezioneOnAndroidBack(pianoSelezioneAttiva, annullaSelezionePiani)
  useAnnullaSelezioneOnAndroidBack(rateSelezioneAttiva, annullaSelezioneRate)

  const ora = new Date()
  const meseCorrente = ora.getMonth() + 1
  const annoCorrente = ora.getFullYear()
  const barraSelezionePianiVisibile = pianoSelezioneAttiva && (tab === 'abbonamento' || tab === 'pagamento_rate')
  const barraSelezioneRateVisibile = rateSelezioneAttiva && tab === 'abbonamento'
  const barraSelezioneVisibile = modalitaSelezione || barraSelezionePianiVisibile || barraSelezioneRateVisibile

  function annullaSelezioneBulk() {
    if (modalitaSelezione) annullaSelezione()
    else if (barraSelezionePianiVisibile) annullaSelezionePiani()
    else if (barraSelezioneRateVisibile) annullaSelezioneRate()
  }

  function titoloSelezioneBulk() {
    if (modalitaSelezione) return `${selezione.length} selezionati`
    if (barraSelezionePianiVisibile) return `${pianiSelezionati.length} selezionati`
    if (barraSelezioneRateVisibile) return `${rateSelezionate.length} selezionate`
    return ''
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#0E9F8E" /></View>
  if (!cliente) return <View style={styles.center}><ActivityIndicator size="large" color="#0E9F8E" /></View>

  return (
    <View style={styles.container}>
      <ClienteDettaglioHeader
        title={cliente.nome || nome}
        onBack={() => router.back()}
        onEdit={apriModificaCliente}
        onDelete={eliminaCliente}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={{
          padding: 16,
          gap: 12,
          paddingBottom: keyboardHeight > 0
            ? keyboardHeight + 24
            : (barraSelezioneVisibile ? 120 : 40),
        }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0E9F8E" colors={["#0E9F8E"]} />}
      >
        <ClienteInfoCard cliente={cliente} />

        <ClienteStats
          preventiviCount={preventivi.filter(p => p.is_ultimo).length}
          totaleValore={totaleValore}
          trascrizioniCount={trascrizioni.length}
          abbonamentoTotale={abbonamentiAttivi.length > 0 ? totaleIncassato + totaleParziale : null}
        />

        <ClienteTabs active={tab} onChange={setTab} />

        {/* Tab Preventivi */}
        {tab === 'preventivi' && (
          <ClientePreventiviList
            preventivi={preventivi}
            selezione={selezione}
            modalitaSelezione={modalitaSelezione}
            aperto={aperto}
            cronologiaAperta={cronologiaAperta}
            cronologia={cronologia}
            cronologiaVersioneAperta={cronologiaVersioneAperta}
            collegamentiPiano={collegamentiPiano}
            onToggleCard={(preventivoId) => { if (modalitaSelezione) toggleSelezione(preventivoId); else setAperto(aperto === preventivoId ? null : preventivoId) }}
            onLongPress={iniziaSelezione}
            onStatoPress={setModalStato}
            onScaricaPdf={scaricaPDF}
            onElimina={eliminaPreventivo}
            onCaricaCronologia={caricaCronologia}
            onToggleVersione={(versioneId) => setCronologiaVersioneAperta(cronologiaVersioneAperta === versioneId ? null : versioneId)}
            onRipristinaVersione={onRipristinaVersione}
            onModificaUltimo={(preventivo) => apriDaPreventivo(preventivo)}
            onSposta={async (preventivoId) => { await caricaClientiDisponibili(); setMostraModalSposta(preventivoId) }}
            onRinomina={(preventivo) => { setNuovoTitolo(preventivo.titolo || ''); setMostraModalRinomina(preventivo.id) }}
            inviiFirma={inviiFirma}
            onInviaFirma={setFirmaModalPreventivo}
            onApriFirmaDettaglio={setFirmaDettaglioPreventivo}
          />
        )}

        {/* Tab Pagamento a rate */}
        {tab === 'pagamento_rate' && (
          <ClientePagamentoRateTab
            onApriPreventivoMadre={apriPreventivoMadre}
            onPianoAggiornato={aggiornaCollegamentiPiano}
            onCampoFocus={scrollCampoInVista}
            onRename={(abbonamentoId, defaultNome) => {
              setAbbonamentoSelezionatoId(abbonamentoId)
              setNomeAbTemp(defaultNome)
              setMostraModalRinominaAb(true)
            }}
            selezionePianoAttiva={pianoSelezioneAttiva}
            pianiSelezionati={pianiSelezionati}
            onAvviaSelezionePiano={avviaSelezionePiano}
            onToggleSelezionePiano={toggleSelezionePiano}
          />
        )}

        {/* Tab Abbonamento */}
        {tab === 'abbonamento' && (
          <ClienteAbbonamentoTab
            loading={loadingAb}
            abbonamentiAttivi={abbonamentiAttivi}
            ratePerPiano={ratePerPiano}
            preventiviMadreStorico={preventiviMadreStorico}
            onApriPreventivoMadre={apriPreventivoMadre}
            meseCorrente={meseCorrente}
            annoCorrente={annoCorrente}
            pianoEspansoId={pianoEspansoId}
            rataMiniAperta={rataMiniAperta}
            invioReminderLoading={invioReminderLoading}
            selezioneAttiva={rateSelezioneAttiva}
            rateSelezionate={rateSelezionate}
            onAvviaSelezione={avviaSelezioneRata}
            onToggleSelezione={toggleSelezioneRata}
            onToggleEspanso={(abbonamentoId) => {
              setPianoEspansoId(prev => {
                const isExpanded = prev === abbonamentoId
                  || (prev === null && abbonamentiAttivi[0]?.id === abbonamentoId)
                if (isExpanded) return prev === abbonamentoId ? null : ''
                return abbonamentoId
              })
            }}
            onRename={(abbonamentoId) => {
              const ab = abbonamentiAttivi.find(a => a.id === abbonamentoId)
              const indice = abbonamentiAttivi.findIndex(a => a.id === abbonamentoId)
              setAbbonamentoSelezionatoId(abbonamentoId)
              setNomeAbTemp(ab?.nome || `Abbonamento N.${indice + 1}`)
              setMostraModalRinominaAb(true)
            }}
            onOpenAddRata={apriModalAggiungiRata}
            onOpenPagamento={apriModalPagamento}
            onSendReminder={inviaReminder}
            onAzzeraPagamento={azzeraPagamento}
            onToggleRataMini={(rataId) => setRataMiniAperta(rataMiniAperta === rataId ? null : rataId)}
            onEditCanone={(abbonamentoId) => {
              const ab = abbonamentiAttivi.find(a => a.id === abbonamentoId)
              if (!ab) return
              setAbbonamentoSelezionatoId(abbonamentoId)
              setAbImporto(ab.importo_default.toString())
              setAbGiorno(ab.giorno_scadenza.toString())
              setMostraModalModificaAb(true)
            }}
            onDeleteAbbonamento={eliminaAbbonamentoCliente}
            selezionePianoAttiva={pianoSelezioneAttiva}
            pianiSelezionati={pianiSelezionati}
            onAvviaSelezionePiano={avviaSelezionePiano}
            onToggleSelezionePiano={toggleSelezionePiano}
          />
        )}

      </ScrollView>
      </KeyboardAvoidingView>

      <MenuAzioniSheet
        variant="dock"
        visible={barraSelezioneVisibile}
        titolo={titoloSelezioneBulk()}
        onClose={annullaSelezioneBulk}
        voci={
          modalitaSelezione
            ? [
                { label: 'Sposta', onPress: async () => { await caricaClientiDisponibili(); setMostraModalSposta('multi') } },
                { label: 'Elimina', onPress: eliminaSelezionati, danger: true },
              ]
            : barraSelezionePianiVisibile
              ? [{ label: 'Elimina', onPress: confermaEliminaPianiSelezionati, danger: true }]
              : [{ label: 'Elimina', onPress: confermaEliminaRateSelezionate, danger: true }]
        }
      />

      {/* Pulsante fondo: azione contestuale per tab */}
      {!barraSelezioneVisibile && (
        tab === 'abbonamento' ? (
          <TouchableOpacity style={styles.nuovoBtn} onPress={apriModaleAbbonamento}>
            <Text style={styles.nuovoBtnText}>+ Nuovo abbonamento</Text>
          </TouchableOpacity>
        ) : tab === 'pagamento_rate' ? (
          <TouchableOpacity style={styles.nuovoBtn} onPress={apriModaleRate}>
            <Text style={styles.nuovoBtnText}>+ Nuovo pagamento a rate</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.nuovoBtn}
            onPress={() => router.push({ pathname: '/(tabs)/nuovo', params: { cliente_id: id, cliente_nome: cliente.nome || nome } })}
          >
            <Text style={styles.nuovoBtnText}>+ Nuovo preventivo</Text>
          </TouchableOpacity>
        )
      )}

      <ClientePreventivoModals
        modalStato={modalStato}
        onCloseStato={() => setModalStato(null)}
        onChangeStato={(preventivoId, stato) => { cambiaStato(preventivoId, stato); eventBus.emit('aggiorna-home') }}
        preventivoStatoCorrente={preventivoModale?.stato}
        preventivoPagato={preventivoModale?.pagato ?? false}
        mostraTogglePagato={!!modalStato && !collegamentiPiano[modalStato]}
        onTogglePagato={async (pagato) => {
          if (!modalStato) return
          await segnaPagato(modalStato, pagato)
          eventBus.emit('aggiorna-home')
        }}
        mostraModalSposta={mostraModalSposta}
        clientiDisponibili={clientiDisponibili}
        onCloseSposta={() => setMostraModalSposta(null)}
        onSposta={(target, clienteId, clienteNome) => { if (target === 'multi') spostaSelezionati(clienteId, clienteNome); else spostaPreventivo(target, clienteId, clienteNome) }}
        mostraModalRinomina={mostraModalRinomina}
        nuovoTitolo={nuovoTitolo}
        onChangeTitolo={setNuovoTitolo}
        onCloseRinomina={() => setMostraModalRinomina(null)}
        onSaveRinomina={rinominaPreventivo}
      />

      <ModificaPreventivoModal
        visible={!!modificaInput}
        input={modificaInput}
        onClose={chiudiSceltaModifica}
      />

      {firmaDettaglioPreventivo ? (
        <FirmaDettaglioModal
          visible
          preventivo={firmaDettaglioPreventivo}
          invio={inviiFirma[firmaDettaglioPreventivo.id]}
          nomeAzienda={nomeAzienda}
          onClose={() => setFirmaDettaglioPreventivo(null)}
          onInviaNuovo={() => setFirmaModalPreventivo(firmaDettaglioPreventivo)}
          onAggiornato={() => {
            ricaricaInviiFirma()
            cambiaStato(firmaDettaglioPreventivo.id, 'accettato')
            eventBus.emit('aggiorna-home')
          }}
          onFirmaAnnullata={() => {
            ricaricaInviiFirma()
            cambiaStato(firmaDettaglioPreventivo.id, 'inviato')
            eventBus.emit('aggiorna-home')
          }}
        />
      ) : null}

      {firmaModalPreventivo ? (
        <InviaFirmaModal
          visible
          preventivoId={firmaModalPreventivo.id}
          nomeCliente={firmaModalPreventivo.nome_cliente || cliente?.nome || 'Cliente'}
          telefonoCliente={cliente?.telefono}
          emailCliente={cliente?.email}
          nomeAzienda={nomeAzienda}
          onClose={() => setFirmaModalPreventivo(null)}
          onInviato={() => {
            ricaricaInviiFirma()
            cambiaStato(firmaModalPreventivo.id, 'inviato')
            eventBus.emit('aggiorna-home')
          }}
          onFirmaManuale={() => setFirmaDettaglioPreventivo(firmaModalPreventivo)}
        />
      ) : null}

      <ClienteAbbonamentoModals
        mostraNuovo={mostraModalNuovoAb}
        onCloseNuovo={() => setMostraModalNuovoAb(false)}
        abImporto={abImporto}
        onChangeAbImporto={setAbImporto}
        abGiorno={abGiorno}
        onChangeAbGiorno={setAbGiorno}
        abMensilita={abMensilita}
        onChangeAbMensilita={setAbMensilita}
        preventiviDisponibili={preventiviSenzaPiano}
        preventivoSelezionatoId={preventivoSelezionatoId}
        onSelectPreventivo={selezionaPreventivoAbbonamento}
        onCreaAbbonamento={salvaNuovoAbbonamento}
        mostraNuovoRate={mostraModalNuovoRate}
        onCloseNuovoRate={() => setMostraModalNuovoRate(false)}
        rateImportoTotale={rateImportoTotale}
        onChangeRateImportoTotale={setRateImportoTotale}
        rateNumero={rateNumero}
        onChangeRateNumero={setRateNumero}
        rateGiorno={rateGiorno}
        onChangeRateGiorno={setRateGiorno}
        rateMeseInizio={rateMeseInizio}
        onChangeRateMeseInizio={setRateMeseInizio}
        preventiviDisponibiliRate={preventiviSenzaPiano}
        preventivoRateSelezionatoId={preventivoRateSelezionatoId}
        onSelectPreventivoRate={selezionaPreventivoRate}
        onCreaPianoRate={salvaNuovoPianoRate}
        mostraModifica={mostraModalModificaAb}
        onCloseModifica={() => setMostraModalModificaAb(false)}
        onAggiornaAbbonamento={salvaModificaAbbonamento}
        rataSelezionata={rataSelezionata}
        onCloseRata={() => setRataSelezionata(null)}
        rataImporto={rataImporto}
        onChangeRataImporto={setRataImporto}
        pagamentoImporto={pagamentoImporto}
        onChangePagamentoImporto={setPagamentoImporto}
        pagamentoNota={pagamentoNota}
        onChangePagamentoNota={setPagamentoNota}
        onConfermaPagamento={confermaPagamentoRata}
        mostraRinomina={mostraModalRinominaAb}
        onCloseRinomina={() => setMostraModalRinominaAb(false)}
        nomeAbTemp={nomeAbTemp}
        onChangeNomeAbTemp={setNomeAbTemp}
        onSalvaRinomina={salvaRinominaAbbonamento}
        mostraAggiungiRata={mostraModalAggiungiRata}
        onCloseAggiungiRata={() => setMostraModalAggiungiRata(false)}
        nuovaRataMese={nuovaRataMese}
        onChangeNuovaRataMese={setNuovaRataMese}
        nuovaRataAnno={nuovaRataAnno}
        onChangeNuovaRataAnno={setNuovaRataAnno}
        nuovaRataImporto={nuovaRataImporto}
        onChangeNuovaRataImporto={setNuovaRataImporto}
        onConfermaAggiungiRata={confermaAggiungiRata}
      />

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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  modalFieldGroup: { gap: 6 },
  modalFieldInput: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 12, fontSize: 14, color: '#0D1B2A' },
  modalFieldLabel: { fontSize: 11, fontWeight: '600' as const, color: '#9CA3AF', letterSpacing: 0.8 },
  modalFullClose: { color: '#9CA3AF', fontSize: 20, width: 40 },
  modalFullContainer: { flex: 1, backgroundColor: '#F7F8FA' },
  modalFullHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56, backgroundColor: '#0D1B2A' },
  modalFullSave: { color: '#0E9F8E', fontSize: 15, fontWeight: '600' as const, width: 40, textAlign: 'right' as const },
  modalFullTitle: { color: '#fff', fontSize: 16, fontWeight: '600' as const },
  nuovoBtn: { backgroundColor: '#0E9F8E', margin: 16, marginTop: 8, borderRadius: 14, padding: 14, alignItems: 'center' as const },
  nuovoBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' as const },
  scroll: { flex: 1 },
})
