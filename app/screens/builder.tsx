import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { creaServizioListino } from '../../lib/api/servizi';
import { Cliente, ProfiloFiscale, Servizio, VocePreventivo } from '../../lib/types';
import { eventBus } from '../../lib/eventBus';
import { trackEvento } from '../../lib/utils/analytics';
import { formatImportoEuroVisuale } from 'preventivoai-shared';
import { builderState, resetBuilderState } from '../../lib/builder/state';
import { caricaClientiBuilder, caricaMetodiPagamentoBuilder, caricaProfiloFiscaleBuilder, caricaServiziBuilder, creaClienteBuilder, metodoContantiDefault } from '../../lib/builder/data';
import { statoAccount } from '../../lib/api/stripeConnect';
import { calcolaFiscalePreventivo, calcolaLordoDaNetto as calcolaLordoDaNettoBuilder, calcolaTotaleTrasferte, calcolaTotaleVoci } from '../../lib/builder/fiscale';
import { parsePreventivoTesto, collegaVociAlListino, trovaMetodoPagamentoDaNome, vociParsedConServizioId } from '../../lib/builder/parsePreventivoText';
import { risolviModifica } from '../../lib/features/modificaPreventivo/modificaSession';
import { generaTestoPreventivoBuilder } from '../../lib/builder/preventivoText';
import { TrasfertaBuilder } from '../../lib/builder/types';
import { VoceCustomModal } from '../../lib/components/builder/VoceCustomModal';
import { TrasferteCard } from '../../lib/components/builder/TrasferteCard';
import { PagamentoCard } from '../../lib/components/builder/PagamentoCard';
import { MetodoPagamentoModal } from '../../lib/components/builder/MetodoPagamentoModal';
import { ServiziListinoCard } from '../../lib/components/builder/ServiziListinoCard';
import { ClienteCard } from '../../lib/components/builder/ClienteCard';
import { NoteAggiuntiveCard } from '../../lib/components/builder/NoteAggiuntiveCard';
import { VociPreventivoCard } from '../../lib/components/builder/VociPreventivoCard';
import { BuilderHeader } from '../../lib/components/builder/BuilderHeader';
import { GeneraPdfButton } from '../../lib/components/builder/GeneraPdfButton';
import { ClienteModal } from '../../lib/components/builder/ClienteModal';
import { BuilderPagamentoRateCard } from '../../lib/components/builder/BuilderPagamentoRateCard';
import { AnalisiFiscaleCard } from '../../lib/components/builder/AnalisiFiscaleCard';
import { PreventivoPdfAbbonamentoCard } from '../../lib/components/preventivoPdf/PreventivoPdfOptionsCards';
import { confermaPagamentoEsclusivo } from '../../lib/utils/confermaPagamentoEsclusivo';
import { meseCorrenteString, validaPianiPagamento } from 'preventivoai-shared';

export { resetBuilderState };

export default function Builder() {
  const [servizi, setServizi] = useState<Servizio[]>([])
  const [voci, setVoci] = useState<VocePreventivo[]>(builderState.voci)
  const [nomeCliente, setNomeCliente] = useState(builderState.nomeCliente)
  const [noteExtra, setNoteExtra] = useState(builderState.noteExtra)
  const [includiIva, setIncludiIva] = useState(builderState.includiIva)
  const [profiloFiscale, setProfiloFiscale] = useState<ProfiloFiscale | null>(null)
  const [mostraFiscale, setMostraFiscale] = useState(true)
  const [clienti, setClienti] = useState<Cliente[]>([])
  const [clienteSelezionato, setClienteSelezionato] = useState<Cliente | null>(null)
  const [mostraModalCliente, setMostraModalCliente] = useState(false)
  const [modalTab, setModalTab] = useState<'esistente' | 'nuovo'>('esistente')
  const [nuovoCliente, setNuovoCliente] = useState({ nome: '', telefono: '', email: '', indirizzo: '' })
  const [salvandoCliente, setSalvandoCliente] = useState(false)
  const [metodiPagamento, setMetodiPagamento] = useState<any[]>([metodoContantiDefault])
  const [metodoPagamentoSelezionato, setMetodoPagamentoSelezionato] = useState<any | null>(null)
  const [stripeChargesEnabled, setStripeChargesEnabled] = useState(false)
  const [mostraModalPagamento, setMostraModalPagamento] = useState(false)
  const [nettoDesiderato, setNettoDesiderato] = useState('')
  const [lordomCalcolato, setLordoCalcolato] = useState<number | null>(null)
  const [ricercaCliente, setRicercaCliente] = useState("")
  const [trasferte, setTrasferte] = useState<TrasfertaBuilder[]>(builderState.trasferte)
  const [mostraTrasferte, setMostraTrasferte] = useState(builderState.mostraTrasferte)
  const [nuovaSpesaNome, setNuovaSpesaNome] = useState(builderState.nuovaSpesaNome)
  const [nuovaSpesaImporto, setNuovaSpesaImporto] = useState(builderState.nuovaSpesaImporto)
  const [nuoviKm, setNuoviKm] = useState(builderState.nuoviKm)
  const [abbonamentoAttivo, setAbbonamentoAttivo] = useState(builderState.abbonamentoAttivo)
  const [abImporto, setAbImporto] = useState(builderState.abImporto)
  const [abGiorno, setAbGiorno] = useState(builderState.abGiorno)
  const [abMeseInizio, setAbMeseInizio] = useState(builderState.abMeseInizio)
  const [abMensilita, setAbMensilita] = useState(builderState.abMensilita)
  const [abVisibileNelPDF, setAbVisibileNelPDF] = useState(builderState.abVisibileNelPDF)
  const [pagamentoRateAttivo, setPagamentoRateAttivo] = useState(builderState.pagamentoRateAttivo)
  const [rateNumero, setRateNumero] = useState(builderState.rateNumero)
  const [rateGiornoScadenza, setRateGiornoScadenza] = useState(builderState.rateGiornoScadenza)
  const [rateMeseInizio, setRateMeseInizio] = useState(builderState.rateMeseInizio)
  const [rateVisibileNelPDF, setRateVisibileNelPDF] = useState(builderState.rateVisibileNelPDF)
  const [storicoVoci, setStoricoVoci] = useState<VocePreventivo[][]>([])
  const [mostraModalVoceCustom, setMostraModalVoceCustom] = useState(false)
  const [voceCustom, setVoceCustom] = useState({ nome: '', descrizione: '', costo: '', quantita: '1', unita: 'cad', salvaNelListino: false })
  const [salvandoVoceCustom, setSalvandoVoceCustom] = useState(false)
  const params = useLocalSearchParams<{
    cliente_id?: string
    cliente_nome?: string
    modifica?: string
    testo_modifica?: string
    versione_padre_id?: string
    versione_numero?: string
  }>()
  const modifica = risolviModifica(params)
  const testoModifica = modifica?.testoPreventivo || ''
  const inModifica = Boolean(testoModifica)
  const insets = useSafeAreaInsets()
  const modificaCaricata = useRef(false)
  const scrollRef = useRef<ScrollView>(null)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [pagamentoImportato, setPagamentoImportato] = useState('')

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

  async function caricaStripeStato() {
    try {
      const s = await statoAccount()
      setStripeChargesEnabled(s.stripe_charges_enabled)
    } catch {
      setStripeChargesEnabled(false)
    }
  }

  useEffect(() => {
    trackEvento('builder_aperto', 'builder')
    caricaServizi()
    caricaProfiloFiscale()
    caricaClienti()
    caricaMetodiPagamento()
    void caricaStripeStato()
    if (params.cliente_id && params.cliente_nome) {
      setClienteSelezionato({ id: params.cliente_id, nome: params.cliente_nome, telefono: null, email: null, indirizzo: null })
    }
  }, [])

  useEffect(() => {
    if (!testoModifica) return

    const parsed = parsePreventivoTesto(testoModifica)
    setVoci(vociParsedConServizioId(collegaVociAlListino(parsed.voci, servizi)))

    if (modificaCaricata.current) return
    modificaCaricata.current = true

    setNoteExtra(parsed.noteExtra)
    setIncludiIva(parsed.includiIva)
    setTrasferte(parsed.trasferte)
    setMostraTrasferte(parsed.trasferte.length > 0)
    setPagamentoImportato(parsed.pagamentoNome)

    const clienteId = modifica?.clienteId || params.cliente_id
    const clienteNome = modifica?.clienteNome || params.cliente_nome
    if (clienteId && clienteNome) {
      setClienteSelezionato({ id: clienteId, nome: clienteNome, telefono: null, email: null, indirizzo: null })
    } else if (parsed.nomeCliente) {
      setNomeCliente(parsed.nomeCliente)
    }
  }, [testoModifica, servizi, modifica?.clienteId, modifica?.clienteNome, params.cliente_id, params.cliente_nome])

  useEffect(() => {
    if (!pagamentoImportato || metodiPagamento.length <= 1) return
    const trovato = trovaMetodoPagamentoDaNome(metodiPagamento, pagamentoImportato)
    if (trovato) setMetodoPagamentoSelezionato(trovato)
  }, [pagamentoImportato, metodiPagamento])

  useEffect(() => {
    builderState.voci = voci
    builderState.nomeCliente = nomeCliente
    builderState.noteExtra = noteExtra
    builderState.includiIva = includiIva
    builderState.trasferte = trasferte
    builderState.mostraTrasferte = mostraTrasferte
    builderState.nuovaSpesaNome = nuovaSpesaNome
    builderState.nuovaSpesaImporto = nuovaSpesaImporto
    builderState.nuoviKm = nuoviKm
    builderState.abbonamentoAttivo = abbonamentoAttivo
    builderState.abImporto = abImporto
    builderState.abGiorno = abGiorno
    builderState.abMeseInizio = abMeseInizio
    builderState.abMensilita = abMensilita
    builderState.abVisibileNelPDF = abVisibileNelPDF
    builderState.pagamentoRateAttivo = pagamentoRateAttivo
    builderState.rateNumero = rateNumero
    builderState.rateGiornoScadenza = rateGiornoScadenza
    builderState.rateMeseInizio = rateMeseInizio
    builderState.rateVisibileNelPDF = rateVisibileNelPDF
  }, [voci, nomeCliente, noteExtra, includiIva, trasferte, mostraTrasferte, nuovaSpesaNome, nuovaSpesaImporto, nuoviKm, abbonamentoAttivo, abImporto, abGiorno, abMeseInizio, abMensilita, abVisibileNelPDF, pagamentoRateAttivo, rateNumero, rateGiornoScadenza, rateMeseInizio, rateVisibileNelPDF])

  useEffect(() => {
    const reset = () => ripristina()
    eventBus.on('reset-builder', reset)
    return () => { eventBus.off('reset-builder', reset) }
  }, [])

  async function caricaMetodiPagamento() {
    const { metodiPagamento, predefinito } = await caricaMetodiPagamentoBuilder()
    if (metodiPagamento) setMetodiPagamento(metodiPagamento)
    if (predefinito && !inModifica) setMetodoPagamentoSelezionato(predefinito)
  }

  async function caricaServizi() {
    const data = await caricaServiziBuilder()
    if (data) setServizi(data)
  }

  async function caricaClienti() {
    const data = await caricaClientiBuilder()
    if (data) setClienti(data)
  }

  async function salvaESelezionaCliente() {
    if (!nuovoCliente.nome.trim()) return
    setSalvandoCliente(true)
    const data = await creaClienteBuilder(nuovoCliente)
    if (data) {
      setClienteSelezionato(data)
      setClienti(c => [...c, data])
    }
    setSalvandoCliente(false)
    setMostraModalCliente(false)
    setNuovoCliente({ nome: '', telefono: '', email: '', indirizzo: '' })
  }

  async function caricaProfiloFiscale() {
    const data = await caricaProfiloFiscaleBuilder()
    if (data) setProfiloFiscale(data)
  }

  function ripristina() {
    resetBuilderState()
    setVoci([])
    setNomeCliente('')
    setNoteExtra('')
    setIncludiIva(false)
    setClienteSelezionato(null)
    setTrasferte([])
    setMostraTrasferte(false)
    setNuovaSpesaNome('')
    setNuovaSpesaImporto('')
    setNuoviKm('')
    setAbbonamentoAttivo(false)
    setAbImporto('')
    setAbGiorno('1')
    setAbMeseInizio(meseCorrenteString())
    setAbMensilita('')
    setAbVisibileNelPDF(true)
    setPagamentoRateAttivo(false)
    setRateNumero('')
    setRateGiornoScadenza('1')
    setRateMeseInizio(meseCorrenteString())
    setRateVisibileNelPDF(true)
  }

  function clienteBuilderCollegato() {
    return Boolean(clienteSelezionato?.id)
  }

  function richiediClientePerPagamentoRicorrente(): boolean {
    if (clienteBuilderCollegato()) return true
    Alert.alert(
      'Seleziona un cliente',
      'Associa un cliente al preventivo per attivare abbonamento mensile o pagamento a rate.',
    )
    return false
  }

  function onChangeAbbonamentoAttivo(v: boolean) {
    if (!v) {
      setAbbonamentoAttivo(false)
      return
    }
    if (!richiediClientePerPagamentoRicorrente()) return
    confermaPagamentoEsclusivo('canone', pagamentoRateAttivo, () => {
      setPagamentoRateAttivo(false)
      setAbbonamentoAttivo(true)
    })
  }

  function onChangePagamentoRateAttivo(v: boolean) {
    if (!v) {
      setPagamentoRateAttivo(false)
      return
    }
    if (!richiediClientePerPagamentoRicorrente()) return
    confermaPagamentoEsclusivo('rate', abbonamentoAttivo, () => {
      setAbbonamentoAttivo(false)
      setPagamentoRateAttivo(true)
    })
  }

  function calcolaTotale() {
    return calcolaTotaleVoci(voci)
  }

  function calcolaFiscale() {
    return calcolaFiscalePreventivo(profiloFiscale, mostraFiscale, voci, trasferte, includiIva)
  }

  function calcolaLordoDaNetto(netto: number): number | null {
    return calcolaLordoDaNettoBuilder(netto, profiloFiscale)
  }

  function aggiungiVoce(s: Servizio) {
    if (voci.find(v => v.servizio_id === s.id)) { Alert.alert('Già aggiunto', 'Questo servizio è già nel preventivo.'); return }
    setVoci(v => [...v, { servizio_id: s.id, nome: s.nome, descrizione: s.descrizione || '', costo: s.costo?.toString() || '', quantita: '1', unita: s.unita }])
  }

  function apriVoceCustom() {
    setVoceCustom({ nome: '', descrizione: '', costo: '', quantita: '1', unita: 'cad', salvaNelListino: false })
    setMostraModalVoceCustom(true)
  }

  async function confermaVoceCustom() {
    if (!voceCustom.nome.trim()) { Alert.alert('Errore', 'Inserisci almeno il nome del servizio'); return }
    setSalvandoVoceCustom(true)
    const costoNormalizzato = voceCustom.costo.trim().replace(',', '.')
    setVoci(v => [...v, {
      servizio_id: `custom-${Date.now()}`,
      nome: voceCustom.nome.trim(),
      descrizione: voceCustom.descrizione.trim(),
      costo: costoNormalizzato,
      quantita: voceCustom.quantita.trim() || '1',
      unita: voceCustom.unita,
    }])

    if (voceCustom.salvaNelListino) {
      const { data, error } = await creaServizioListino({ ...voceCustom, costo: costoNormalizzato, ordine: servizi.length })
      if (error) Alert.alert('Voce aggiunta', 'Aggiunta al preventivo, ma non salvata nel listino.')
      if (!error && data) setServizi(s => [...s, data])
    }

    setSalvandoVoceCustom(false)
    setMostraModalVoceCustom(false)
    setVoceCustom({ nome: '', descrizione: '', costo: '', quantita: '1', unita: 'cad', salvaNelListino: false })
  }

  function rimuoviVoce(id: string) { setVoci(v => v.filter(x => x.servizio_id !== id)) }
  function aggiornaVoce(id: string, campo: 'costo' | 'quantita' | 'descrizione', valore: string) {
    setVoci(v => v.map(x => x.servizio_id === id ? { ...x, [campo]: valore } : x))
  }

  function generaTestoPreventivo() {
    return generaTestoPreventivoBuilder({ nomeCliente, voci, trasferte, includiIva, noteExtra, metodoPagamentoSelezionato })
  }

  function generaPDF() {
    if (voci.length === 0) { Alert.alert('Preventivo vuoto', 'Aggiungi almeno un servizio.'); return }
    const errPiani = validaPianiPagamento({
      pagamentoRateAttivo,
      abbonamentoAttivo,
      clienteCollegato: clienteBuilderCollegato(),
      rateNumero,
      rateGiornoScadenza,
      rateMeseInizio,
      abGiorno,
      abMeseInizio,
    })
    if (errPiani) {
      Alert.alert('Attenzione', errPiani)
      return
    }
    const testo = generaTestoPreventivo()
    const mpId = metodoPagamentoSelezionato?.id || ''
    trackEvento('builder_pdf_generato', 'builder', { num_voci: voci.length, ha_trasferte: trasferte.length > 0 })
    router.push({
      pathname: '/screens/preventivo-pdf',
      params: {
        testo,
        cliente_id: clienteSelezionato?.id || params.cliente_id || '',
        metodo_pagamento_id: mpId,
        importo_totale: totaleConIva.toFixed(0),
        versione_padre_id: modifica?.versionePadreId || params.versione_padre_id || '',
        ab_attivo: abbonamentoAttivo ? '1' : '0',
        ab_importo: abImporto,
        ab_giorno: abGiorno,
        ab_mese_inizio: abMeseInizio,
        ab_mensilita: abMensilita,
        ab_visibile: abVisibileNelPDF ? '1' : '0',
        rate_attivo: pagamentoRateAttivo ? '1' : '0',
        rate_numero: rateNumero,
        rate_giorno: rateGiornoScadenza,
        rate_mese_inizio: rateMeseInizio,
        rate_visibile: rateVisibileNelPDF ? '1' : '0',
      }
    })
  }

  const totale = calcolaTotale()
  const totaleTrasferte = calcolaTotaleTrasferte(trasferte)
  const totaleConIva = includiIva ? (totale + totaleTrasferte) * 1.22 : (totale + totaleTrasferte)
  const f = calcolaFiscale()
  const fmt = formatImportoEuroVisuale

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <BuilderHeader
        onBack={() => router.back()}
        onRipristina={() => {
          Alert.alert('Ripristina', 'Vuoi svuotare il preventivo?', [
            { text: 'Annulla', style: 'cancel' },
            { text: 'Svuota', style: 'destructive', onPress: ripristina }
          ])
        }}
      />

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          keyboardHeight > 0 && {
            paddingBottom: Platform.OS === 'ios' ? keyboardHeight + 24 : 48,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      >

        <ClienteCard
          clienteSelezionato={clienteSelezionato}
          onOpenCliente={() => setMostraModalCliente(true)}
          onClearCliente={() => {
            setClienteSelezionato(null)
            setAbbonamentoAttivo(false)
            setPagamentoRateAttivo(false)
          }}
        />

        <ServiziListinoCard
          servizi={servizi}
          voci={voci}
          onConfiguraServizi={() => router.push('/screens/listino')}
          onAggiungiVoce={aggiungiVoce}
          onRimuoviVoce={rimuoviVoce}
          onAggiungiVoceCustom={apriVoceCustom}
        />

        <VociPreventivoCard
          voci={voci}
          includiIva={includiIva}
          totale={totale}
          totaleConIva={totaleConIva}
          onToggleIva={() => setIncludiIva(v => !v)}
          onRimuoviVoce={rimuoviVoce}
          onAggiornaVoce={aggiornaVoce}
        />

        <PagamentoCard
          metodiPagamento={metodiPagamento}
          metodoPagamentoSelezionato={metodoPagamentoSelezionato}
          onOpen={() => setMostraModalPagamento(true)}
          onConfigura={() => router.push('/screens/pagamenti')}
        />

        <BuilderPagamentoRateCard
          attivo={pagamentoRateAttivo}
          numeroRate={rateNumero}
          giornoScadenza={rateGiornoScadenza}
          meseInizio={rateMeseInizio}
          visibileNelPDF={rateVisibileNelPDF}
          importoTotale={totaleConIva}
          onChangeAttivo={onChangePagamentoRateAttivo}
          onChangeNumeroRate={setRateNumero}
          onChangeGiornoScadenza={setRateGiornoScadenza}
          onChangeMeseInizio={setRateMeseInizio}
          onChangeVisibileNelPDF={setRateVisibileNelPDF}
        />

        <PreventivoPdfAbbonamentoCard
          attivo={abbonamentoAttivo}
          importo={abImporto}
          giorno={abGiorno}
          meseInizio={abMeseInizio}
          mensilita={abMensilita}
          visibileNelPDF={abVisibileNelPDF}
          importoTotale={totaleConIva.toFixed(0)}
          onChangeAttivo={onChangeAbbonamentoAttivo}
          onChangeImporto={setAbImporto}
          onChangeGiorno={setAbGiorno}
          onChangeMeseInizio={setAbMeseInizio}
          onChangeMensilita={setAbMensilita}
          onChangeVisibileNelPDF={setAbVisibileNelPDF}
        />

        <TrasferteCard
          trasferte={trasferte}
          setTrasferte={setTrasferte}
          mostraTrasferte={mostraTrasferte}
          setMostraTrasferte={setMostraTrasferte}
          nuoviKm={nuoviKm}
          setNuoviKm={setNuoviKm}
          nuovaSpesaNome={nuovaSpesaNome}
          setNuovaSpesaNome={setNuovaSpesaNome}
          nuovaSpesaImporto={nuovaSpesaImporto}
          setNuovaSpesaImporto={setNuovaSpesaImporto}
        />

        <NoteAggiuntiveCard
          noteExtra={noteExtra}
          setNoteExtra={setNoteExtra}
          onInputFocus={scrollCampoInVista}
        />

        <AnalisiFiscaleCard
          profiloFiscale={profiloFiscale}
          mostraFiscale={mostraFiscale}
          setMostraFiscale={setMostraFiscale}
          fiscale={f}
          voci={voci}
          setVoci={setVoci}
          storicoVoci={storicoVoci}
          setStoricoVoci={setStoricoVoci}
          nettoDesiderato={nettoDesiderato}
          setNettoDesiderato={setNettoDesiderato}
          lordomCalcolato={lordomCalcolato}
          setLordoCalcolato={setLordoCalcolato}
          calcolaLordoDaNetto={calcolaLordoDaNetto}
          calcolaTotale={calcolaTotale}
          fmt={fmt}
          onInputFocus={scrollCampoInVista}
        />

      </ScrollView>

      {keyboardHeight === 0 && (
        <GeneraPdfButton
          disabled={voci.length === 0}
          totaleConIva={totaleConIva}
          onPress={generaPDF}
          bottomInset={insets.bottom}
        />
      )}

      <VoceCustomModal
        visible={mostraModalVoceCustom}
        voceCustom={voceCustom}
        salvando={salvandoVoceCustom}
        onClose={() => setMostraModalVoceCustom(false)}
        onConfirm={confermaVoceCustom}
        setVoceCustom={setVoceCustom}
      />

      <MetodoPagamentoModal
        visible={mostraModalPagamento}
        metodiPagamento={metodiPagamento}
        metodoPagamentoSelezionato={metodoPagamentoSelezionato}
        stripeChargesEnabled={stripeChargesEnabled}
        onClose={() => setMostraModalPagamento(false)}
        onSelect={(metodo) => { setMetodoPagamentoSelezionato(metodo); setMostraModalPagamento(false) }}
      />

      <ClienteModal
        visible={mostraModalCliente}
        clienti={clienti}
        clienteSelezionato={clienteSelezionato}
        modalTab={modalTab}
        setModalTab={setModalTab}
        ricercaCliente={ricercaCliente}
        setRicercaCliente={setRicercaCliente}
        nuovoCliente={nuovoCliente}
        setNuovoCliente={setNuovoCliente}
        salvandoCliente={salvandoCliente}
        onClose={() => setMostraModalCliente(false)}
        onSelectCliente={(cliente) => { setClienteSelezionato(cliente); setMostraModalCliente(false) }}
        onSalvaCliente={salvaESelezionaCliente}
      />
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, gap: 14 },
})
