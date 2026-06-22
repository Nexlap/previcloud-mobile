import * as FileSystem from 'expo-file-system/legacy'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native'
import { generaPDF as generaPDFApi, generaPDFFile, salvaPDF as salvaPDFApi } from "../../lib/api/pdf"
import {
  PreventivoPdfClienteButton,
  PreventivoPdfFooter,
  PreventivoPdfPagamentoInfo,
} from '../../lib/components/preventivoPdf/PreventivoPdfActions'
import { PreventivoPdfHeader } from '../../lib/components/preventivoPdf/PreventivoPdfHeader'
import {
  PreventivoPdfClienteModal,
  PreventivoPdfPagamentoModal,
  PreventivoPdfTitoloModal,
} from '../../lib/components/preventivoPdf/PreventivoPdfModals'
import { BuilderPagamentoRateCard } from '../../lib/components/builder/BuilderPagamentoRateCard'
import {
  PreventivoPdfAbbonamentoCard,
  PreventivoPdfTariffaToggle,
} from '../../lib/components/preventivoPdf/PreventivoPdfOptionsCards'
import { PreventivoPdfPreviewCard } from '../../lib/components/preventivoPdf/PreventivoPdfPreviewCard'
import { PreventivoPdfSuccessModal, type PdfSuccessInvio } from '../../lib/components/preventivoPdf/PreventivoPdfSuccessModal'
import { PreventivoPdfTemplatePicker } from '../../lib/components/preventivoPdf/PreventivoPdfTemplatePicker'
import { eventBus } from '../../lib/eventBus'
import { scalaHtmlPreview, testoConPagamento } from '../../lib/features/preventivoPdf/text'
import { importoDaTesto, meseCorrenteString, parseImportoEuro, validaPianiPagamento } from 'preventivoai-shared'
import {
  aggiornaTitoloPreventivo,
  caricaClientePreventivo,
  caricaClientiPreventivo,
  caricaMetodiPagamentoPreventivo,
  caricaTemplatePreferito,
  creaAbbonamentoDaPreventivo,
  creaPianoRateDaPreventivo,
  creaClientePreventivo,
  ClientePreventivo,
  MetodoPagamento,
  salvaPreventivoPdf,
  salvaTemplatePreferito,
  segnaPreventivoInviato,
  tokenPreventivoPdf,
} from '../../lib/api/preventivoPdf'
import { statoAccount } from '../../lib/api/stripeConnect'
import { confermaPagamentoEsclusivo } from '../../lib/utils/confermaPagamentoEsclusivo'
import { trackEvento } from '../../lib/utils/analytics'
import { errorMessage } from '../../lib/utils/errors'
import { resetBuilderState } from './builder'
import { bozzaBuilderVuota, cancellaBozzaBuilder, caricaBozzaBuilder, salvaBozzaBuilder } from '../../lib/builder/draft'
import { builderState } from '../../lib/builder/state'

type Params = {
  testo: string
  versione_padre_id: string
  cliente_id: string
  metodo_pagamento_id: string
  metodo_pagamento_nessuno?: string
  importo_totale: string
  ab_attivo?: string
  ab_importo?: string
  ab_giorno?: string
  ab_mensilita?: string
  ab_mese_inizio?: string
  ab_visibile?: string
  rate_attivo?: string
  rate_numero?: string
  rate_giorno?: string
  rate_mese_inizio?: string
  rate_visibile?: string
}

export default function PreventivoPDF() {
  const {
    testo: testoParam,
    versione_padre_id,
    cliente_id,
    metodo_pagamento_id,
    metodo_pagamento_nessuno,
    importo_totale,
    ab_attivo,
    ab_importo,
    ab_giorno,
    ab_mensilita,
    ab_mese_inizio,
    ab_visibile,
    rate_attivo,
    rate_numero,
    rate_giorno,
    rate_mese_inizio,
    rate_visibile,
  } = useLocalSearchParams<Params>()

  const [testo] = useState(testoParam || '')
  const [template, setTemplate] = useState('pulito')
  const [generando, setGenerando] = useState(false)
  const [token, setToken] = useState('')
  const [clienti, setClienti] = useState<ClientePreventivo[]>([])
  const [clienteSelezionato, setClienteSelezionato] = useState<ClientePreventivo | null>(null)
  const [mostraModalCliente, setMostraModalCliente] = useState(false)
  const [nuovoNomeCliente, setNuovoNomeCliente] = useState('')
  const [modalTab, setModalTab] = useState<'esistente' | 'nuovo'>('esistente')
  const [titolo, setTitolo] = useState('')
  const [mostraModalTitolo, setMostraModalTitolo] = useState(false)
  const [preventivoSalvatoId, setPreventivoSalvatoId] = useState<string | null>(null)
  const [nascondiPrezzi, setNascondiPrezzi] = useState(builderState.nascondiPrezzi)
  const [htmlPreview, setHtmlPreview] = useState('')
  const [caricandoPreview, setCaricandoPreview] = useState(false)
  const [metodiPagamento, setMetodiPagamento] = useState<MetodoPagamento[]>([])
  const [metodoPagamentoSelezionato, setMetodoPagamentoSelezionato] = useState<MetodoPagamento | null>(null)
  const [stripeChargesEnabled, setStripeChargesEnabled] = useState(false)
  const [mostraModalPagamento, setMostraModalPagamento] = useState(false)
  const [abbonamentoAttivo, setAbbonamentoAttivo] = useState(false)
  const [abImporto, setAbImporto] = useState('')
  const [abGiorno, setAbGiorno] = useState('1')
  const [abMeseInizio, setAbMeseInizio] = useState(meseCorrenteString())
  const [abMensilita, setAbMensilita] = useState('')
  const [abVisibileNelPDF, setAbVisibileNelPDF] = useState(true)
  const [pagamentoRateAttivo, setPagamentoRateAttivo] = useState(false)
  const [rateNumero, setRateNumero] = useState('')
  const [rateGiornoScadenza, setRateGiornoScadenza] = useState('1')
  const [rateMeseInizio, setRateMeseInizio] = useState(meseCorrenteString())
  const [rateVisibileNelPDF, setRateVisibileNelPDF] = useState(true)
  const previewTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [segnaInviato, setSegnaInviato] = useState(false)
  const [modalPdfSuccesso, setModalPdfSuccesso] = useState<{
    pdfUri: string
    dettaglio: string
    invio: PdfSuccessInvio
  } | null>(null)

  async function caricaStripeStato() {
    try {
      const s = await statoAccount()
      setStripeChargesEnabled(s.stripe_charges_enabled)
    } catch {
      setStripeChargesEnabled(false)
    }
  }

  useEffect(() => {
    trackEvento('preview_pdf_aperta', 'preventivo-pdf')
    tokenPreventivoPdf().then(setToken)
    caricaTemplatePref()
    caricaClienti()
    caricaMetodiPagamento()
    void caricaStripeStato()
  }, [])

  useEffect(() => {
    if (cliente_id) {
      caricaClientePreventivo(cliente_id).then(data => { if (data) setClienteSelezionato(data) })
    }
  }, [cliente_id])

  useEffect(() => {
    if (ab_attivo === '1') setAbbonamentoAttivo(true)
    if (ab_importo) setAbImporto(ab_importo)
    if (ab_giorno) setAbGiorno(ab_giorno)
    if (ab_mese_inizio) setAbMeseInizio(ab_mese_inizio)
    if (ab_mensilita) setAbMensilita(ab_mensilita)
    if (ab_visibile === '0') setAbVisibileNelPDF(false)
  }, [ab_attivo, ab_importo, ab_giorno, ab_mese_inizio, ab_mensilita, ab_visibile])

  useEffect(() => {
    if (rate_attivo === '1') setPagamentoRateAttivo(true)
    if (rate_numero) setRateNumero(rate_numero)
    if (rate_giorno) setRateGiornoScadenza(rate_giorno)
    if (rate_mese_inizio) setRateMeseInizio(rate_mese_inizio)
    if (rate_visibile === '0') setRateVisibileNelPDF(false)
  }, [rate_attivo, rate_numero, rate_giorno, rate_mese_inizio, rate_visibile])

  useEffect(() => {
    builderState.nascondiPrezzi = nascondiPrezzi
    const timeout = setTimeout(() => {
      void (async () => {
        const draft = await caricaBozzaBuilder()
        if (!draft || bozzaBuilderVuota(draft)) return
        await salvaBozzaBuilder({ ...draft, nascondiPrezzi })
      })()
    }, 800)
    return () => clearTimeout(timeout)
  }, [nascondiPrezzi])

  const importoTotaleNum = importo_totale
    ? (parseImportoEuro(String(importo_totale)) ?? 0)
    : 0

  useEffect(() => {
    if (!token || !testo) return
    if (previewTimeout.current) clearTimeout(previewTimeout.current)
    previewTimeout.current = setTimeout(() => aggiornaPreview(), 300)
  }, [template, token, testo, clienteSelezionato, nascondiPrezzi, metodoPagamentoSelezionato, abbonamentoAttivo, abImporto, abGiorno, abMeseInizio, abVisibileNelPDF, pagamentoRateAttivo, rateNumero, rateGiornoScadenza, rateMeseInizio, rateVisibileNelPDF, importo_totale])

  function onChangeAbbonamentoAttivo(v: boolean) {
    if (!v) {
      setAbbonamentoAttivo(false)
      return
    }
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
    confermaPagamentoEsclusivo('rate', abbonamentoAttivo, () => {
      setAbbonamentoAttivo(false)
      setPagamentoRateAttivo(true)
    })
  }

  async function buildTestoConPagamento() {
    const importoRate = importoTotaleNum > 0 ? importoTotaleNum : (importoDaTesto(testo) ?? 0)
    return testoConPagamento({
      testo,
      abbonamentoAttivo,
      abVisibileNelPDF,
      abImporto,
      abGiorno,
      abMeseInizio: parseInt(abMeseInizio, 10) || 0,
      pagamentoRateAttivo,
      rateVisibileNelPDF,
      rateImportoTotale: importoRate,
      rateNumero: parseInt(rateNumero, 10) || 0,
      rateGiornoScadenza: parseInt(rateGiornoScadenza, 10) || 0,
      rateMeseInizio: parseInt(rateMeseInizio, 10) || 0,
      metodoPagamento: metodoPagamentoSelezionato,
      token,
    })
  }

  async function aggiornaPreview() {
    if (!token || !testo) return
    setCaricandoPreview(true)
    try {
      const data = await generaPDFApi({
        testo: await buildTestoConPagamento(),
        template,
        token,
        versione_padre_id: null,
        cliente_id: clienteSelezionato?.id || '',
        nascondi_prezzi: nascondiPrezzi,
      })
      if (data.html) setHtmlPreview(scalaHtmlPreview(data.html))
    } catch {
      return
    }
    setCaricandoPreview(false)
  }

  async function caricaTemplatePref() {
    const templatePreferito = await caricaTemplatePreferito()
    if (templatePreferito) setTemplate(templatePreferito)
  }

  async function caricaClienti() {
    setClienti(await caricaClientiPreventivo())
  }

  async function caricaMetodiPagamento() {
    const data = await caricaMetodiPagamentoPreventivo()
    setMetodiPagamento(data)
    if (metodo_pagamento_nessuno === '1') {
      setMetodoPagamentoSelezionato(null)
      return
    }
    const metodoDaParam = metodo_pagamento_id ? data.find(m => m.id === metodo_pagamento_id) : null
    const predefinito = data.find(m => m.predefinito)
    if (metodoDaParam || predefinito) setMetodoPagamentoSelezionato(metodoDaParam || predefinito || null)
  }

  async function aggiungiESelezionaCliente() {
    if (!nuovoNomeCliente.trim()) return
    const data = await creaClientePreventivo(nuovoNomeCliente)
    if (data) {
      setClienteSelezionato({ id: data.id, nome: data.nome })
      setClienti(c => [...c, { id: data.id, nome: data.nome }])
      setMostraModalCliente(false)
      setNuovoNomeCliente('')
    }
  }

  async function generaPDF() {
    const errPiani = validaPianiPagamento({
      pagamentoRateAttivo,
      abbonamentoAttivo,
      clienteCollegato: Boolean(clienteSelezionato?.id),
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
    setGenerando(true)
    try {
      const testoFinale = await buildTestoConPagamento()
      const data = await generaPDFFile({
        testo: testoFinale,
        template,
        token,
        versione_padre_id: versione_padre_id || null,
        cliente_id: clienteSelezionato?.id || '',
        nascondi_prezzi: nascondiPrezzi,
      })
      const uri = `${FileSystem.cacheDirectory}preventivo-${Date.now()}.pdf`
      await FileSystem.writeAsStringAsync(uri, data.pdf_base64, { encoding: 'base64' as FileSystem.EncodingType })

      let pdfUrl = ''
      let uploadOk = false
      try {
        pdfUrl = await salvaPDFApi(data.pdf_base64, token)
        uploadOk = !!pdfUrl
      } catch {
        uploadOk = false
      }

      const titoloAuto = clienteSelezionato
        ? `Preventivo ${clienteSelezionato.nome}`
        : `Preventivo ${new Date().toLocaleDateString('it-IT')}`
      const idSalvato = await salvaSuSupabase(data.versione, titoloAuto, pdfUrl)
      if (idSalvato) setPreventivoSalvatoId(idSalvato)

      resetBuilderState()
      void cancellaBozzaBuilder()
      eventBus.emit('reset-builder')

      if (abbonamentoAttivo && clienteSelezionato && idSalvato) {
        const abbonamento = await creaAbbonamentoDaPreventivo({
          cliente: clienteSelezionato,
          preventivoId: idSalvato,
          importoRaw: abImporto,
          giornoRaw: abGiorno,
          meseInizioRaw: abMeseInizio,
          mensilitaRaw: abMensilita,
        })
        if (abbonamento.esistente) {
          Alert.alert('Abbonamento esistente', 'Questo preventivo ha già un piano collegato. Gestiscilo dalla cartella cliente.')
        }
      }

      if (pagamentoRateAttivo && clienteSelezionato && idSalvato) {
        const importoRate = importoTotaleNum > 0 ? importoTotaleNum : (importoDaTesto(testo) ?? 0)
        const piano = await creaPianoRateDaPreventivo({
          cliente: clienteSelezionato,
          preventivoId: idSalvato,
          importoTotale: importoRate,
          numeroRateRaw: rateNumero,
          giornoScadenzaRaw: rateGiornoScadenza,
          meseInizioRaw: rateMeseInizio,
        })
        if (piano.esistente) {
          Alert.alert('Piano a rate esistente', `${clienteSelezionato.nome} ha già un piano a rate attivo. Gestiscilo dalla sua cartella cliente.`)
        }
      }

      setTitolo(clienteSelezionato ? `Preventivo ${clienteSelezionato.nome}` : '')
      setModalPdfSuccesso({
        pdfUri: uri,
        dettaglio: 'Preventivo salvato sul dispositivo.',
        invio: {
          preventivoId: idSalvato,
          clienteId: clienteSelezionato?.id,
          nomeCliente: clienteSelezionato?.nome,
          haStripe: testoFinale.includes('LINK PAGAMENTO:'),
          uploadOnlineOk: uploadOk,
        },
      })
    } catch (err: unknown) {
      Alert.alert('Errore', errorMessage(err))
    }
    setGenerando(false)
  }

  function chiudiModalPdfSuccesso() {
    setModalPdfSuccesso(null)
    setTimeout(() => setMostraModalTitolo(true), 400)
  }

  async function salvaSuSupabase(ver: number, titoloScelto: string, pdfUrl: string = ''): Promise<string | null> {
    const importoParam = importo_totale ? parseImportoEuro(String(importo_totale)) : null
    const importo = importoDaTesto(testo)
      ?? (importoParam != null && !Number.isNaN(importoParam) ? importoParam : null)
    return salvaPreventivoPdf({
      testo,
      template,
      versione: ver,
      versionePadreId: versione_padre_id || null,
      cliente: clienteSelezionato,
      titolo: titoloScelto,
      pdfUrl,
      importoTotale: importo,
    })
  }

  async function aggiornaTitolo(nuovoTitolo: string) {
    if (!preventivoSalvatoId || !nuovoTitolo.trim()) return
    await aggiornaTitoloPreventivo(preventivoSalvatoId, nuovoTitolo)
  }

  async function salvaTemplate(tmpl: string) {
    setTemplate(tmpl)
    await salvaTemplatePreferito(tmpl)
  }

  async function chiudiTitoloModal(conSalvataggio: boolean) {
    setMostraModalTitolo(false)
    if (conSalvataggio) await aggiornaTitolo(titolo)
    if (segnaInviato && preventivoSalvatoId) {
      await segnaPreventivoInviato(preventivoSalvatoId)
      eventBus.emit('aggiorna-home')
    }
    setSegnaInviato(false)
  }

  return (
    <View style={styles.container}>
      <PreventivoPdfHeader onBack={() => router.back()} />

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16, gap: 14 }}>
        <PreventivoPdfPreviewCard htmlPreview={htmlPreview} caricandoPreview={caricandoPreview} />
        <PreventivoPdfTemplatePicker template={template} onSelectTemplate={salvaTemplate} />
        <View style={styles.opzioniDocumento}>
          <Text style={styles.opzioniDocumentoTitle}>Opzioni documento</Text>
          <PreventivoPdfTariffaToggle nascondiPrezzi={nascondiPrezzi} onChangeNascondiPrezzi={setNascondiPrezzi} />
          <PreventivoPdfAbbonamentoCard
            attivo={abbonamentoAttivo}
            importo={abImporto}
            giorno={abGiorno}
            meseInizio={abMeseInizio}
            mensilita={abMensilita}
            visibileNelPDF={abVisibileNelPDF}
            importoTotale={importo_totale}
            onChangeAttivo={onChangeAbbonamentoAttivo}
            onChangeImporto={setAbImporto}
            onChangeGiorno={setAbGiorno}
            onChangeMeseInizio={setAbMeseInizio}
            onChangeMensilita={setAbMensilita}
            onChangeVisibileNelPDF={setAbVisibileNelPDF}
          />
          <BuilderPagamentoRateCard
            attivo={pagamentoRateAttivo}
            numeroRate={rateNumero}
            giornoScadenza={rateGiornoScadenza}
            meseInizio={rateMeseInizio}
            visibileNelPDF={rateVisibileNelPDF}
            importoTotale={importoTotaleNum}
            onChangeAttivo={onChangePagamentoRateAttivo}
            onChangeNumeroRate={setRateNumero}
            onChangeGiornoScadenza={setRateGiornoScadenza}
            onChangeMeseInizio={setRateMeseInizio}
            onChangeVisibileNelPDF={setRateVisibileNelPDF}
          />
        </View>
        <PreventivoPdfClienteButton
          cliente={clienteSelezionato}
          onPressCliente={() => setMostraModalCliente(true)}
        />
        {metodoPagamentoSelezionato ? (
          <PreventivoPdfPagamentoInfo metodo={metodoPagamentoSelezionato} />
        ) : null}
        <PreventivoPdfFooter
          versionePadreId={versione_padre_id}
          generando={generando}
          testoVuoto={!testo.trim()}
          onGenera={generaPDF}
        />
        <View style={{ height: 40 }} />
      </ScrollView>

      <PreventivoPdfPagamentoModal
        visible={mostraModalPagamento}
        metodiPagamento={metodiPagamento}
        metodoSelezionato={metodoPagamentoSelezionato}
        stripeChargesEnabled={stripeChargesEnabled}
        onClose={() => setMostraModalPagamento(false)}
        onSelect={setMetodoPagamentoSelezionato}
      />

      <PreventivoPdfClienteModal
        visible={mostraModalCliente}
        clienti={clienti}
        clienteSelezionato={clienteSelezionato}
        modalTab={modalTab}
        nuovoNomeCliente={nuovoNomeCliente}
        onClose={() => setMostraModalCliente(false)}
        onChangeTab={setModalTab}
        onChangeNuovoNome={setNuovoNomeCliente}
        onSelectCliente={setClienteSelezionato}
        onAggiungiCliente={aggiungiESelezionaCliente}
      />

      <PreventivoPdfTitoloModal
        visible={mostraModalTitolo}
        titolo={titolo}
        segnaInviato={segnaInviato}
        onChangeTitolo={setTitolo}
        onToggleSegnaInviato={() => setSegnaInviato(v => !v)}
        onSave={() => chiudiTitoloModal(true)}
        onSkip={() => chiudiTitoloModal(false)}
      />

      <PreventivoPdfSuccessModal
        visible={modalPdfSuccesso !== null}
        dettaglio={modalPdfSuccesso?.dettaglio}
        pdfUri={modalPdfSuccesso?.pdfUri}
        invio={modalPdfSuccesso?.invio}
        onClose={chiudiModalPdfSuccesso}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  scroll: { flex: 1 },
  opzioniDocumento: { gap: 14 },
  opzioniDocumentoTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginLeft: 2,
  },
})
