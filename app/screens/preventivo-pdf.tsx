import * as FileSystem from 'expo-file-system/legacy'
import { router, useLocalSearchParams } from 'expo-router'
import * as Sharing from 'expo-sharing'
import { useEffect, useRef, useState } from 'react'
import { Alert, Animated, ScrollView, StyleSheet, View } from 'react-native'
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
import {
  PreventivoPdfAbbonamentoCard,
  PreventivoPdfTariffaToggle,
} from '../../lib/components/preventivoPdf/PreventivoPdfOptionsCards'
import { PreventivoPdfPreviewCard, PreventivoPdfToast } from '../../lib/components/preventivoPdf/PreventivoPdfPreviewCard'
import { PreventivoPdfTemplatePicker } from '../../lib/components/preventivoPdf/PreventivoPdfTemplatePicker'
import { eventBus } from '../../lib/eventBus'
import { importoDaTesto, scalaHtmlPreview, testoConPagamento } from '../../lib/features/preventivoPdf/text'
import {
  aggiornaTitoloPreventivo,
  caricaClientePreventivo,
  caricaClientiPreventivo,
  caricaMetodiPagamentoPreventivo,
  caricaTemplatePreferito,
  creaAbbonamentoDaPreventivo,
  creaClientePreventivo,
  ClientePreventivo,
  MetodoPagamento,
  salvaPreventivoPdf,
  salvaTemplatePreferito,
  segnaPreventivoInviato,
  tokenPreventivoPdf,
} from '../../lib/api/preventivoPdf'
import { trackEvento } from "../../lib/utils/analytics"
import { errorMessage } from '../../lib/utils/errors'
import { resetBuilderState } from './builder'

type Params = {
  testo: string
  versione_padre_id: string
  cliente_id: string
  metodo_pagamento_id: string
  importo_totale: string
}

export default function PreventivoPDF() {
  const { testo: testoParam, versione_padre_id, cliente_id, metodo_pagamento_id, importo_totale } = useLocalSearchParams<Params>()

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
  const [nascondiPrezzi, setNascondiPrezzi] = useState(false)
  const [htmlPreview, setHtmlPreview] = useState('')
  const [caricandoPreview, setCaricandoPreview] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)
  const [metodiPagamento, setMetodiPagamento] = useState<MetodoPagamento[]>([])
  const [metodoPagamentoSelezionato, setMetodoPagamentoSelezionato] = useState<MetodoPagamento | null>(null)
  const [mostraModalPagamento, setMostraModalPagamento] = useState(false)
  const [abbonamentoAttivo, setAbbonamentoAttivo] = useState(false)
  const [abImporto, setAbImporto] = useState('')
  const [abGiorno, setAbGiorno] = useState('1')
  const [abMensilita, setAbMensilita] = useState('')
  const [abVisibileNelPDF, setAbVisibileNelPDF] = useState(true)
  const toastOpacity = useRef(new Animated.Value(0)).current
  const previewTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [segnaInviato, setSegnaInviato] = useState(false)

  useEffect(() => {
    trackEvento('preview_pdf_aperta', 'preventivo-pdf')
    tokenPreventivoPdf().then(setToken)
    caricaTemplatePref()
    caricaClienti()
    caricaMetodiPagamento()
  }, [])

  useEffect(() => {
    if (cliente_id) {
      caricaClientePreventivo(cliente_id).then(data => { if (data) setClienteSelezionato(data) })
    }
  }, [cliente_id])

  useEffect(() => {
    if (!token || !testo) return
    if (previewTimeout.current) clearTimeout(previewTimeout.current)
    previewTimeout.current = setTimeout(() => aggiornaPreview(), 300)
  }, [template, token, testo, clienteSelezionato, nascondiPrezzi, metodoPagamentoSelezionato, abbonamentoAttivo, abImporto, abVisibileNelPDF])

  async function buildTestoConPagamento() {
    return testoConPagamento({
      testo,
      abbonamentoAttivo,
      abVisibileNelPDF,
      abImporto,
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
    setGenerando(true)
    try {
      const data = await generaPDFFile({
        testo: await buildTestoConPagamento(),
        template,
        token,
        versione_padre_id: versione_padre_id || null,
        cliente_id: clienteSelezionato?.id || '',
        nascondi_prezzi: nascondiPrezzi,
      })
      const uri = `${FileSystem.cacheDirectory}preventivo-${Date.now()}.pdf`
      await FileSystem.writeAsStringAsync(uri, data.pdf_base64, { encoding: 'base64' as FileSystem.EncodingType })

      let pdfUrl = ''
      try {
        pdfUrl = await salvaPDFApi(data.pdf_base64, token)
      } catch {}

      const titoloAuto = clienteSelezionato
        ? `Preventivo ${clienteSelezionato.nome}`
        : `Preventivo ${new Date().toLocaleDateString('it-IT')}`
      const idSalvato = await salvaSuSupabase(data.versione, titoloAuto, pdfUrl)
      if (idSalvato) setPreventivoSalvatoId(idSalvato)

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Invia preventivo', UTI: 'com.adobe.pdf' })
        trackEvento('pdf_condiviso', 'preventivo-pdf', { template })
      }

      mostraToast()
      resetBuilderState()
      eventBus.emit('reset-builder')

      if (abbonamentoAttivo && clienteSelezionato && idSalvato) {
        const abbonamento = await creaAbbonamentoDaPreventivo({
          cliente: clienteSelezionato,
          preventivoId: idSalvato,
          importoRaw: abImporto,
          giornoRaw: abGiorno,
          mensilitaRaw: abMensilita,
        })
        if (abbonamento.esistente) {
          Alert.alert('Abbonamento esistente', `${clienteSelezionato.nome} ha già un abbonamento attivo. Gestiscilo dalla sua cartella cliente.`)
        }
      }

      setTitolo(clienteSelezionato ? `Preventivo ${clienteSelezionato.nome}` : '')
      setTimeout(() => setMostraModalTitolo(true), 800)
    } catch (err: unknown) {
      Alert.alert('Errore', errorMessage(err))
    }
    setGenerando(false)
  }

  async function salvaSuSupabase(ver: number, titoloScelto: string, pdfUrl: string = ''): Promise<string | null> {
    const importo = importoDaTesto(testo)
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

  function mostraToast() {
    setToastVisible(true)
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(toastOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => setToastVisible(false))
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
        <PreventivoPdfTariffaToggle nascondiPrezzi={nascondiPrezzi} onChangeNascondiPrezzi={setNascondiPrezzi} />
        <PreventivoPdfAbbonamentoCard
          attivo={abbonamentoAttivo}
          importo={abImporto}
          giorno={abGiorno}
          mensilita={abMensilita}
          visibileNelPDF={abVisibileNelPDF}
          importoTotale={importo_totale}
          onChangeAttivo={setAbbonamentoAttivo}
          onChangeImporto={setAbImporto}
          onChangeGiorno={setAbGiorno}
          onChangeMensilita={setAbMensilita}
          onChangeVisibileNelPDF={setAbVisibileNelPDF}
        />
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

      <PreventivoPdfToast visible={toastVisible} opacity={toastOpacity} />

      <PreventivoPdfPagamentoModal
        visible={mostraModalPagamento}
        metodiPagamento={metodiPagamento}
        metodoSelezionato={metodoPagamentoSelezionato}
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
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  scroll: { flex: 1 },
})
