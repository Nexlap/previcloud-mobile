import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert, ScrollView, StyleSheet, View
} from 'react-native';
import { creaServizioListino } from '../../lib/api/servizi';
import { Cliente, Servizio, VocePreventivo } from '../../lib/types';
import { eventBus } from '../../lib/eventBus';
import { trackEvento } from '../../lib/utils/analytics';
import { builderState, resetBuilderState } from '../../lib/builder/state';
import { caricaClientiBuilder, caricaMetodiPagamentoBuilder, caricaProfiloFiscaleBuilder, caricaServiziBuilder, creaClienteBuilder, metodoContantiDefault } from '../../lib/builder/data';
import { calcolaFiscalePreventivo, calcolaLordoDaNetto as calcolaLordoDaNettoBuilder, calcolaTotaleTrasferte, calcolaTotaleVoci } from '../../lib/builder/fiscale';
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
import { AnalisiFiscaleCard } from '../../lib/components/builder/AnalisiFiscaleCard';

export { resetBuilderState };

export default function Builder() {
  const [servizi, setServizi] = useState<Servizio[]>([])
  const [voci, setVoci] = useState<VocePreventivo[]>(builderState.voci)
  const [nomeCliente, setNomeCliente] = useState(builderState.nomeCliente)
  const [noteExtra, setNoteExtra] = useState(builderState.noteExtra)
  const [includiIva, setIncludiIva] = useState(builderState.includiIva)
  const [profiloFiscale, setProfiloFiscale] = useState<any>(null)
  const [mostraFiscale, setMostraFiscale] = useState(true)
  const [clienti, setClienti] = useState<Cliente[]>([])
  const [clienteSelezionato, setClienteSelezionato] = useState<Cliente | null>(null)
  const [mostraModalCliente, setMostraModalCliente] = useState(false)
  const [modalTab, setModalTab] = useState<'esistente' | 'nuovo'>('esistente')
  const [nuovoCliente, setNuovoCliente] = useState({ nome: '', telefono: '', email: '', indirizzo: '' })
  const [salvandoCliente, setSalvandoCliente] = useState(false)
  const [metodiPagamento, setMetodiPagamento] = useState<any[]>([metodoContantiDefault])
  const [metodoPagamentoSelezionato, setMetodoPagamentoSelezionato] = useState<any | null>(null)
  const [mostraModalPagamento, setMostraModalPagamento] = useState(false)
  const [nettoDesiderato, setNettoDesiderato] = useState('')
  const [lordomCalcolato, setLordoCalcolato] = useState<number | null>(null)
  const [ricercaCliente, setRicercaCliente] = useState("")
  const [trasferte, setTrasferte] = useState<TrasfertaBuilder[]>(builderState.trasferte)
  const [mostraTrasferte, setMostraTrasferte] = useState(builderState.mostraTrasferte)
  const [nuovaSpesaNome, setNuovaSpesaNome] = useState(builderState.nuovaSpesaNome)
  const [nuovaSpesaImporto, setNuovaSpesaImporto] = useState(builderState.nuovaSpesaImporto)
  const [nuoviKm, setNuoviKm] = useState(builderState.nuoviKm)
  const [storicoVoci, setStoricoVoci] = useState<VocePreventivo[][]>([])
  const [mostraModalVoceCustom, setMostraModalVoceCustom] = useState(false)
  const [voceCustom, setVoceCustom] = useState({ nome: '', descrizione: '', costo: '', quantita: '1', unita: 'cad', salvaNelListino: false })
  const [salvandoVoceCustom, setSalvandoVoceCustom] = useState(false)
  const params = useLocalSearchParams<{ cliente_id?: string, cliente_nome?: string }>()

  useEffect(() => {
    trackEvento('builder_aperto', 'builder')
    caricaServizi()
    caricaProfiloFiscale()
    caricaClienti()
    caricaMetodiPagamento()
    if (params.cliente_id && params.cliente_nome) {
      setClienteSelezionato({ id: params.cliente_id, nome: params.cliente_nome, telefono: null, email: null, indirizzo: null })
    }
  }, [])

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
  }, [voci, nomeCliente, noteExtra, includiIva, trasferte, mostraTrasferte, nuovaSpesaNome, nuovaSpesaImporto, nuoviKm])

  useEffect(() => {
    const reset = () => ripristina()
    eventBus.on('reset-builder', reset)
    return () => { eventBus.off('reset-builder', reset) }
  }, [])

  async function caricaMetodiPagamento() {
    const { metodiPagamento, predefinito } = await caricaMetodiPagamentoBuilder()
    if (metodiPagamento) setMetodiPagamento(metodiPagamento)
    if (predefinito) setMetodoPagamentoSelezionato(predefinito)
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
    const testo = generaTestoPreventivo()
    const mpId = metodoPagamentoSelezionato?.id || ''
    trackEvento('builder_pdf_generato', 'builder', { num_voci: voci.length, ha_trasferte: trasferte.length > 0 })
    router.push({
      pathname: '/screens/preventivo-pdf',
      params: {
        testo,
        cliente_id: clienteSelezionato?.id || '',
        metodo_pagamento_id: mpId,
        importo_totale: totaleConIva.toFixed(0),
      }
    })
  }

  const totale = calcolaTotale()
  const totaleTrasferte = calcolaTotaleTrasferte(trasferte)
  const totaleConIva = includiIva ? (totale + totaleTrasferte) * 1.22 : (totale + totaleTrasferte)
  const f = calcolaFiscale()
  const fmt = (n: number) => n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)

  return (
    <View style={styles.container}>
      <BuilderHeader
        onBack={() => router.back()}
        onRipristina={() => {
          Alert.alert('Ripristina', 'Vuoi svuotare il preventivo?', [
            { text: 'Annulla', style: 'cancel' },
            { text: 'Svuota', style: 'destructive', onPress: ripristina }
          ])
        }}
      />

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>

        <ClienteCard
          clienteSelezionato={clienteSelezionato}
          onOpenCliente={() => setMostraModalCliente(true)}
          onClearCliente={() => setClienteSelezionato(null)}
        />

        <ServiziListinoCard
          servizi={servizi}
          voci={voci}
          onConfiguraServizi={() => router.push('/(tabs)/settings')}
          onAggiungiVoce={aggiungiVoce}
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

        <NoteAggiuntiveCard noteExtra={noteExtra} setNoteExtra={setNoteExtra} />

        <GeneraPdfButton
          disabled={voci.length === 0}
          totaleConIva={totaleConIva}
          onPress={generaPDF}
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
        />

        <View style={{ height: 40 }} />
      </ScrollView>

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



    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
})
