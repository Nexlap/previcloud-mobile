import * as FileSystem from 'expo-file-system/legacy'
import { router, useLocalSearchParams, useNavigation } from 'expo-router'
import * as Sharing from 'expo-sharing'
import { useEffect, useState } from 'react'
import type { EventArg, NavigationAction } from '@react-navigation/native'
import {
  ActivityIndicator, Alert, BackHandler,
  Linking,
  Modal,
  RefreshControl, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View
} from 'react-native'
import { MESI_BREVI } from '../../lib/constants'
import { creaLinkPagamentoRata } from '../../lib/api/pdf'
import { aggiornaClienteDettaglio, caricaClienteDettaglio, caricaClientiDisponibili as caricaClientiDisponibiliData, caricaCollegamentiPianoPreventivo, caricaCronologiaCliente, eliminaClienteDettaglio, eliminaPreventiviCliente, sessioneClienteDettaglio, spostaPreventiviCliente } from '../../lib/api/clienteDettaglio'
import { ripristinaVersionePreventivo } from '../../lib/api/storico'
import { eventBus } from '../../lib/eventBus'
import { useAbbonamento } from '../../lib/hooks/useAbbonamento'
import { usePreventivi } from '../../lib/hooks/usePreventivi'
import { Cliente, Preventivo, RataAbbonamento, Trascrizione } from '../../lib/types'
import { trackEvento } from '../../lib/utils/analytics'
import { errorMessage } from '../../lib/utils/errors'
import { ModificaPreventivoModal } from '../../lib/components/modificaPreventivo/ModificaPreventivoModal'
import { useModificaPreventivoScelta } from '../../lib/features/modificaPreventivo/useModificaPreventivoScelta'
import { ClienteAbbonamentoTab } from '../../lib/components/clienteDettaglio/ClienteAbbonamentoTab'
import { AbbonamentoRateSelectionBar } from '../../lib/components/clienteDettaglio/AbbonamentoRateSelectionBar'
import { ClienteAbbonamentoModals } from '../../lib/components/clienteDettaglio/ClienteAbbonamentoModals'
import {
  ClienteDettaglioHeader,
  ClienteInfoCard,
  ClienteSelectionBar,
  ClienteStats,
  ClienteTabs,
} from '../../lib/components/clienteDettaglio/ClienteOverview'
import { ClientePreventivoModals } from '../../lib/components/clienteDettaglio/ClientePreventivoModals'
import { ClientePreventiviList } from '../../lib/components/clienteDettaglio/ClientePreventiviList'
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
  const [abEspanso, setAbEspanso] = useState(true)
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
  const [collegamentiPiano, setCollegamentiPiano] = useState<Record<string, 'canone' | 'rate'>>({})

  const {
    preventivi, totaleValore,
    cambiaStato, eliminaPreventivo: eliminaPrev, rinominaPreventivo, spostaPreventivo,
    onRefresh: onRefreshPreventivi
  } = usePreventivi({ clienteId: id })

  const {
    abbonamento, abbonamentiStorico, preventivoMadre, preventiviMadreStorico, rate, loading: loadingAb,
    creaAbbonamento, aggiornaAbbonamento, eliminaAbbonamento,
    registraPagamento, azzeraPagamento,
    aggiungiRataMese, eliminaRate, rinominaAbbonamento, modificaImportoRata,
    totaleIncassato, totaleParziale, carica: caricaAb
  } = useAbbonamento(id, { soloTipo: 'canone' })

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
    const [{ cliente, trascrizioni }, collegamenti] = await Promise.all([
      caricaClienteDettaglio(id),
      caricaCollegamentiPianoPreventivo(id),
    ])
    if (cliente) setCliente(cliente)
    setTrascrizioni(trascrizioni)
    setCollegamentiPiano(collegamenti)
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
  }

  async function eliminaAbbonamentoCliente() {
    await eliminaAbbonamento()
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
      router.push({ pathname: '/screens/preventivo-pdf', params: { testo: p.testo_preventivo || '', cliente_id: p.cliente_id || '' } })
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
    const tipo = mensilita ? 'rate' : 'canone'
    await creaAbbonamento(importo, giorno, { numeroMensilita: mensilita, tipo })
    setMostraModalNuovoAb(false)
  }

  async function salvaModificaAbbonamento() {
    const importo = parseFloat(abImporto.replace(',', '.'))
    const giorno = parseInt(abGiorno)
    if (!importo || importo <= 0) { Alert.alert('Inserisci un importo valido'); return }
    await aggiornaAbbonamento(importo, giorno)
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
    setRataSelezionata(null)
  }

  async function salvaRinominaAbbonamento() {
    await rinominaAbbonamento(nomeAbTemp)
    setMostraModalRinominaAb(false)
  }

  function apriModalAggiungiRata() {
    if (!abbonamento) return
    setNuovaRataMese(String(meseCorrente))
    setNuovaRataAnno(String(annoCorrente))
    setNuovaRataImporto(abbonamento.importo_default.toString())
    setMostraModalAggiungiRata(true)
  }

  async function confermaAggiungiRata() {
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
    const ok = await aggiungiRataMese(mese, anno, importo)
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

  function avviaSelezioneRata(rataId: string) {
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

  const ora = new Date()
  const meseCorrente = ora.getMonth() + 1
  const annoCorrente = ora.getFullYear()

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#0E9F8E" /></View>
  if (!cliente) return <View style={styles.center}><ActivityIndicator size="large" color="#0E9F8E" /></View>

  const rataMeseCorrente = rate.find(r => r.mese === meseCorrente && r.anno === annoCorrente)
const rateStoriche = rate.filter(r =>
  !(r.mese === meseCorrente && r.anno === annoCorrente)
)

  return (
    <View style={styles.container}>
      <ClienteDettaglioHeader
        title={cliente.nome || nome}
        onBack={() => router.back()}
        onEdit={apriModificaCliente}
        onDelete={eliminaCliente}
      />

      {modalitaSelezione && (
        <ClienteSelectionBar
          count={selezione.length}
          onCancel={annullaSelezione}
          onMove={async () => { await caricaClientiDisponibili(); setMostraModalSposta('multi') }}
          onDelete={eliminaSelezionati}
        />
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0E9F8E" colors={["#0E9F8E"]} />}
      >
        <ClienteInfoCard cliente={cliente} />

        <ClienteStats
          preventiviCount={preventivi.filter(p => p.is_ultimo).length}
          totaleValore={totaleValore}
          trascrizioniCount={trascrizioni.length}
          abbonamentoTotale={abbonamento ? totaleIncassato + totaleParziale : null}
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
          />
        )}

        {/* Tab Pagamento a rate */}
        {tab === 'pagamento_rate' && (
          <ClientePagamentoRateTab
            onApriPreventivoMadre={apriPreventivoMadre}
            onPianoAggiornato={aggiornaCollegamentiPiano}
          />
        )}

        {/* Tab Abbonamento */}
        {tab === 'abbonamento' && (
          <ClienteAbbonamentoTab
            loading={loadingAb}
            abbonamento={abbonamento}
            preventivoMadre={preventivoMadre}
            abbonamentiStorico={abbonamentiStorico}
            preventiviMadreStorico={preventiviMadreStorico}
            onApriPreventivoMadre={apriPreventivoMadre}
            totaleIncassato={totaleIncassato}
            meseCorrente={meseCorrente}
            annoCorrente={annoCorrente}
            rataMeseCorrente={rataMeseCorrente}
            rateStoriche={rateStoriche}
            abEspanso={abEspanso}
            rataMiniAperta={rataMiniAperta}
            invioReminderLoading={invioReminderLoading}
            selezioneAttiva={rateSelezioneAttiva}
            rateSelezionate={rateSelezionate}
            onAvviaSelezione={avviaSelezioneRata}
            onToggleSelezione={toggleSelezioneRata}
            onCreate={() => { setAbImporto(''); setAbGiorno('1'); setAbMensilita(''); setMostraModalNuovoAb(true) }}
            onToggleEspanso={() => setAbEspanso(v => !v)}
            onRename={() => { setNomeAbTemp(abbonamento?.nome || 'Abbonamento N.1'); setMostraModalRinominaAb(true) }}
            onOpenAddRata={apriModalAggiungiRata}
            onOpenPagamento={apriModalPagamento}
            onSendReminder={inviaReminder}
            onAzzeraPagamento={azzeraPagamento}
            onToggleRataMini={(rataId) => setRataMiniAperta(rataMiniAperta === rataId ? null : rataId)}
            onEditCanone={() => { if (!abbonamento) return; setAbImporto(abbonamento.importo_default.toString()); setAbGiorno(abbonamento.giorno_scadenza.toString()); setMostraModalModificaAb(true) }}
            onDeleteAbbonamento={eliminaAbbonamentoCliente}
          />
        )}

        <View style={{ height: rateSelezioneAttiva && tab === 'abbonamento' ? 120 : 40 }} />
      </ScrollView>

      {tab === 'abbonamento' && rateSelezioneAttiva && (
        <AbbonamentoRateSelectionBar
          count={rateSelezionate.length}
          onCancel={annullaSelezioneRate}
          onDelete={confermaEliminaRateSelezionate}
        />
      )}

      {/* Bottone nuovo preventivo */}
      {!(tab === 'abbonamento' && rateSelezioneAttiva) && (
      <TouchableOpacity
        style={styles.nuovoBtn}
        onPress={() => router.push({ pathname: '/(tabs)/nuovo', params: { cliente_id: id, cliente_nome: cliente.nome || nome } })}
      >
        <Text style={styles.nuovoBtnText}>+ Nuovo preventivo</Text>
      </TouchableOpacity>
      )}

      <ClientePreventivoModals
        modalStato={modalStato}
        onCloseStato={() => setModalStato(null)}
        onChangeStato={(preventivoId, stato) => { cambiaStato(preventivoId, stato); eventBus.emit('aggiorna-home') }}
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

      <ClienteAbbonamentoModals
        mostraNuovo={mostraModalNuovoAb}
        onCloseNuovo={() => setMostraModalNuovoAb(false)}
        abImporto={abImporto}
        onChangeAbImporto={setAbImporto}
        abGiorno={abGiorno}
        onChangeAbGiorno={setAbGiorno}
        abMensilita={abMensilita}
        onChangeAbMensilita={setAbMensilita}
        onCreaAbbonamento={salvaNuovoAbbonamento}
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
