import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { Cliente, Servizio, VocePreventivo } from '../../lib/types';
import { trackEvento } from '../../lib/utils/analytics';

interface RisultatoFiscale {
  regime: string; lordo: number; netto: number
  rivalsa: number; totaleCliente: number; imponibile: number
  contributi: number; imposta: number; iva: number; irpef: number; ritenuta: number
}

//
const builderState = {
  voci: [] as VocePreventivo[],
  nomeCliente: '',
  noteExtra: '',
  includiIva: false,
}

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
  const [mostraCalcoloInverso, setMostraCalcoloInverso] = useState(false)
  const [metodiPagamento, setMetodiPagamento] = useState<any[]>([{ id: 'contanti-default', tipo: 'contanti', nome: 'Paga in contanti', dati: {}, predefinito: false }])
  const [metodoPagamentoSelezionato, setMetodoPagamentoSelezionato] = useState<any | null>(null)
  const [mostraModalPagamento, setMostraModalPagamento] = useState(false)
  const [nettoDesiderato, setNettoDesiderato] = useState('')
  const [lordomCalcolato, setLordoCalcolato] = useState<number | null>(null)
  const [ricercaCliente, setRicercaCliente] = useState("")
  const [trasferte, setTrasferte] = useState<{ id: string; tipo: 'km' | 'spesa'; nome: string; importo: string; km?: string; esente: boolean }[]>([])
  const [mostraTrasferte, setMostraTrasferte] = useState(false)
  const [nuovaSpesaNome, setNuovaSpesaNome] = useState('')
  const [nuovaSpesaImporto, setNuovaSpesaImporto] = useState('')
  const [nuoviKm, setNuoviKm] = useState('')
  const [storicoVoci, setStoricoVoci] = useState<VocePreventivo[][]>([])
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
  }, [voci, nomeCliente, noteExtra, includiIva])

  async function caricaMetodiPagamento() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('metodi_pagamento').select('*').eq('user_id', user.id).order('predefinito', { ascending: false })
    if (data) {
      setMetodiPagamento([{ id: 'contanti-default', tipo: 'contanti', nome: 'Paga in contanti', dati: {}, predefinito: false }, ...data])
      const predefinito = data.find((m: any) => m.predefinito)
      if (predefinito) setMetodoPagamentoSelezionato(predefinito)
    }
  }

  async function caricaServizi() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('servizi').select('*').eq('user_id', user.id).order('ordine', { ascending: true })
    if (data) setServizi(data)
  }

  async function caricaClienti() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('clienti').select('id, nome, telefono, email, indirizzo')
      .eq('user_id', user.id).order('nome')
    if (data) setClienti(data)
  }

  async function salvaESelezionaCliente() {
    if (!nuovoCliente.nome.trim()) return
    setSalvandoCliente(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('clienti').insert({
      user_id: user.id,
      nome: nuovoCliente.nome.trim(),
      telefono: nuovoCliente.telefono || null,
      email: nuovoCliente.email || null,
      indirizzo: nuovoCliente.indirizzo || null,
    }).select().single()
    if (data) {
      setClienteSelezionato(data)
      setClienti(c => [...c, data])
    }
    setSalvandoCliente(false)
    setMostraModalCliente(false)
    setNuovoCliente({ nome: '', telefono: '', email: '', indirizzo: '' })
  }

  async function caricaProfiloFiscale() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profili_fiscali').select('*').eq('user_id', user.id).single()
    if (data?.attivo) setProfiloFiscale(data)
  }

  function ripristina() {
    builderState.voci = []
    builderState.nomeCliente = ''
    builderState.noteExtra = ''
    builderState.includiIva = false
    setVoci([])
    setNomeCliente('')
    setNoteExtra('')
    setIncludiIva(false)
    setClienteSelezionato(null)
    setTrasferte([])
  }

  function calcolaIrpef(base: number): number {
    const scaglioni = [{ fino: 28000, aliquota: 0.23 }, { fino: 50000, aliquota: 0.35 }, { fino: Infinity, aliquota: 0.43 }]
    let imposta = 0; let precedente = 0
    for (const s of scaglioni) {
      if (base <= precedente) break
      imposta += (Math.min(base, s.fino) - precedente) * s.aliquota
      precedente = s.fino
    }
    return imposta
  }

  function calcolaTotale() {
    return voci.reduce((acc, v) => acc + (parseFloat(v.costo) || 0) * (parseFloat(v.quantita) || 1), 0)
  }

  function calcolaFiscale(): RisultatoFiscale | null {
    if (!profiloFiscale || !mostraFiscale) return null
    const totaleImponibileTrasferte = trasferte.filter(t => !t.esente).reduce((a, t) => a + (parseFloat(t.importo) || 0), 0)
    const lordo = calcolaTotale() + totaleImponibileTrasferte
    const p = profiloFiscale
    const zero: RisultatoFiscale = { regime: '', lordo, netto: 0, rivalsa: 0, totaleCliente: 0, imponibile: 0, contributi: 0, imposta: 0, iva: 0, irpef: 0, ritenuta: 0 }

    if (p.regime === 'forfettario') {
      const rivalsa = p.rivalsa_inps ? lordo * (p.rivalsa_percentuale / 100) : 0
      const totaleCliente = lordo + rivalsa
      const imponibile = lordo * (p.coefficiente_redditivita / 100)
      const inpsPerc = p.riduzione_contributiva ? p.inps_percentuale * (1 - p.riduzione_percentuale / 100) : p.inps_percentuale
      const contributi = imponibile * (inpsPerc / 100)
      const imposta = imponibile * (p.aliquota_sostitutiva / 100)
      const netto = lordo + rivalsa - contributi - imposta
      return { ...zero, regime: 'forfettario', rivalsa, totaleCliente, imponibile, contributi, imposta, netto }
    }
    if (p.regime === 'ordinario') {
      const iva = includiIva ? lordo * (p.aliquota_iva / 100) : 0
      const rivalsa = p.rivalsa_inps ? lordo * (p.rivalsa_percentuale / 100) : 0
      const totaleCliente = lordo + iva + rivalsa
      const costiDeducibili = lordo * (p.costi_deducibili_percentuale / 100)
      const imponibile = lordo - costiDeducibili
      const contributi = imponibile * (p.inps_percentuale / 100)
      const irpef = calcolaIrpef(imponibile - contributi)
      const netto = lordo + rivalsa - contributi - irpef
      return { ...zero, regime: 'ordinario', iva, rivalsa, totaleCliente, imponibile, contributi, irpef, netto }
    }
    if (p.regime === 'occasionale') {
      const ritenuta = lordo * (p.ritenuta_acconto / 100)
      return { ...zero, regime: 'occasionale', ritenuta, netto: lordo - ritenuta }
    }
    return null
  }

  function calcolaLordoDaNetto(netto: number): number | null {
    if (!profiloFiscale) return null
    const p = profiloFiscale
    if (p.regime === 'forfettario') {
      const rivalsaPerc = p.rivalsa_inps ? p.rivalsa_percentuale / 100 : 0
      const coeffPerc = p.coefficiente_redditivita / 100
      const inpsPerc = p.riduzione_contributiva
        ? p.inps_percentuale * (1 - p.riduzione_percentuale / 100) / 100
        : p.inps_percentuale / 100
      const aliquotaPerc = p.aliquota_sostitutiva / 100
      const moltiplicatore = 1 + rivalsaPerc - coeffPerc * inpsPerc - coeffPerc * aliquotaPerc
      return netto / moltiplicatore
    }
    if (p.regime === 'ordinario') {
      let lordo = netto * 1.4
      for (let i = 0; i < 10; i++) {
        const costiDeducibili = lordo * (p.costi_deducibili_percentuale / 100)
        const imponibile = lordo - costiDeducibili
        const contributi = imponibile * (p.inps_percentuale / 100)
        const irpef = calcolaIrpef(imponibile - contributi)
        const nettoCalcolato = lordo - contributi - irpef
        lordo = lordo + (netto - nettoCalcolato) * 0.8
      }
      return lordo
    }
    if (p.regime === 'occasionale') {
      return netto / (1 - p.ritenuta_acconto / 100)
    }
    return null
  }

  function aggiungiVoce(s: Servizio) {
    if (voci.find(v => v.servizio_id === s.id)) { Alert.alert('Già aggiunto', 'Questo servizio è già nel preventivo.'); return }
    setVoci(v => [...v, { servizio_id: s.id, nome: s.nome, descrizione: s.descrizione || '', costo: s.costo?.toString() || '', quantita: '1', unita: s.unita }])
  }

  function rimuoviVoce(id: string) { setVoci(v => v.filter(x => x.servizio_id !== id)) }
  function aggiornaVoce(id: string, campo: 'costo' | 'quantita' | 'descrizione', valore: string) {
    setVoci(v => v.map(x => x.servizio_id === id ? { ...x, [campo]: valore } : x))
  }

  function generaTestoPreventivo() {
    const oggi = new Date().toLocaleDateString('it-IT')
    let testo = `PREVENTIVO\nData: ${oggi}  |  Validita': 30 giorni\n`
    if (nomeCliente) testo += `Cliente: ${nomeCliente}\n`
    testo += `\nSERVIZI:\n`
    voci.forEach(v => {
      const qty = parseFloat(v.quantita) || 1
      const costo = parseFloat(v.costo) || 0
      const totaleVoce = (qty * costo).toFixed(0)
      testo += `\nSERVIZIO: ${v.nome}\n`
      if (v.descrizione) testo += `DETTAGLI:\n- ${v.descrizione}\n`
      if (qty > 1) testo += `DETTAGLI:\n- ${qty} ${v.unita}\n`
      testo += `PREZZO: €${totaleVoce}\n`
    })
    if (trasferte.length > 0) {
      testo += `\nRIMBORSI SPESE:\n`
      trasferte.forEach(t => {
        if (t.tipo === 'km') {
          testo += `RIMBORSO: Trasferta km\nDETTAGLIO: ${t.km} km × €0.25 = €${t.importo}\nTIPO: ${t.esente ? 'Esente' : 'Imponibile'}\n`
        } else {
          testo += `RIMBORSO: ${t.nome}\nDETTAGLIO: Spesa viva\nTIPO: ${t.esente ? 'Esente' : 'Imponibile'}\nIMPORTO: €${t.importo}\n`
        }
      })
    }
    const totaleTrasferte = trasferte.reduce((a, t) => a + (parseFloat(t.importo) || 0), 0)
    const totaleFinale = calcolaTotale() + totaleTrasferte
    testo += `\nRIEPILOGO:\n`
    if (includiIva) {
      testo += `Imponibile: €${totaleFinale.toFixed(2).replace(/\.00$/, '')}\nIVA 22%: €${(totaleFinale * 0.22).toFixed(2).replace(/\.00$/, '')}\n─────────────────\nTOTALE: €${(totaleFinale * 1.22).toFixed(2).replace(/\.00$/, '')}\n`
    } else {
      testo += `TOTALE: €${totaleFinale.toFixed(2).replace(/\.00$/, '')}\n`
    }
    if (noteExtra) testo += `\nNote: ${noteExtra}`
    if (metodoPagamentoSelezionato) {
      const m = metodoPagamentoSelezionato
      let pagamento = `\nPAGAMENTO: ${m.nome}`
      if (m.tipo === 'bonifico' && m.dati?.iban) pagamento += `\nIBAN: ${m.dati.iban}`
      if (m.tipo === 'bonifico' && m.dati?.intestatario) pagamento += `\nIntestatario: ${m.dati.intestatario}`
      if (m.tipo === 'paypal' && m.dati?.email) pagamento += `\nPayPal: ${m.dati.email}`
      testo += pagamento
    }
    return testo
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
  const totaleTrasferte = trasferte.reduce((a, t) => a + (parseFloat(t.importo) || 0), 0)
  const totaleConIva = includiIva ? (totale + totaleTrasferte) * 1.22 : (totale + totaleTrasferte)
  const f = calcolaFiscale()
  const fmt = (n: number) => n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Builder preventivo</Text>
        <TouchableOpacity onPress={() => {
          Alert.alert('Ripristina', 'Vuoi svuotare il preventivo?', [
            { text: 'Annulla', style: 'cancel' },
            { text: 'Svuota', style: 'destructive', onPress: ripristina }
          ])
        }}>
          <Text style={{ color: '#9CA3AF', fontSize: 13 }}>🗑 Ripristina</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>

        {/* Card cliente */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>👤 Cliente</Text>
          <Text style={styles.cardSub}>Opzionale — i dati appariranno nel PDF</Text>
          {clienteSelezionato ? (
            <View style={styles.clienteSelezionatoBox}>
              <View style={{ flex: 1 }}>
                <Text style={styles.clienteSelezionatoNome}>{clienteSelezionato.nome}</Text>
                {clienteSelezionato.email ? <Text style={styles.clienteSelezionatoInfo}>{clienteSelezionato.email}</Text> : null}
                {clienteSelezionato.telefono ? <Text style={styles.clienteSelezionatoInfo}>{clienteSelezionato.telefono}</Text> : null}
              </View>
              <TouchableOpacity onPress={() => setClienteSelezionato(null)}>
                <Text style={{ fontSize: 18, color: '#9CA3AF' }}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.clienteAggiungiBtn} onPress={() => setMostraModalCliente(true)}>
              <Text style={styles.clienteAggiungiIcon}>+</Text>
              <Text style={styles.clienteAggiungiText}>Seleziona o aggiungi cliente</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>I tuoi servizi</Text>
          <Text style={styles.cardSub}>Tocca + per aggiungere al preventivo</Text>
          {servizi.length === 0 ? (
            <TouchableOpacity onPress={() => router.push('/(tabs)/settings')}>
              <Text style={styles.emptyText}>Nessun servizio configurato — tocca qui per aggiungerli</Text>
            </TouchableOpacity>
          ) : servizi.map(s => (
            <View key={s.id} style={styles.servizioRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.servizioNome}>{s.nome}</Text>
                {s.costo ? <Text style={styles.servizioCosto}>€{s.costo}/{s.unita}</Text> : null}
              </View>
              <TouchableOpacity
                style={[styles.addBtn, voci.find(v => v.servizio_id === s.id) && styles.addBtnDone]}
                onPress={() => aggiungiVoce(s)}
              >
                <Text style={styles.addBtnText}>{voci.find(v => v.servizio_id === s.id) ? '✓' : '+'}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {voci.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Preventivo</Text>
            <Text style={styles.cardSub}>Modifica quantità e costo al volo</Text>
            {voci.map(v => (
              <View key={v.servizio_id} style={styles.voceRow}>
                <View style={styles.voceHeader}>
                  <Text style={styles.voceNome}>{v.nome}</Text>
                  <TouchableOpacity onPress={() => rimuoviVoce(v.servizio_id)}>
                    <Text style={styles.voceRemove}>✕</Text>
                  </TouchableOpacity>
                </View>
                <TextInput style={styles.voceDesc} value={v.descrizione}
                  onChangeText={val => aggiornaVoce(v.servizio_id, 'descrizione', val)}
                  placeholder="Descrizione (opzionale)" placeholderTextColor="#9CA3AF" />
                <View style={styles.voceCostoRow}>
                  <View style={styles.voceCostoBox}>
                    <Text style={styles.voceCostoLabel}>QTÀ</Text>
                    <TextInput style={styles.voceCostoInput} value={v.quantita}
                      onChangeText={val => aggiornaVoce(v.servizio_id, 'quantita', val)} keyboardType="decimal-pad" />
                  </View>
                  <Text style={styles.voceMoltiply}>×</Text>
                  <View style={styles.voceCostoBox}>
                    <Text style={styles.voceCostoLabel}>€ / {v.unita}</Text>
                    <TextInput style={styles.voceCostoInput} value={v.costo}
                      onChangeText={val => aggiornaVoce(v.servizio_id, 'costo', val)} keyboardType="decimal-pad" />
                  </View>
                  <Text style={styles.voceUguale}>=</Text>
                  <View style={styles.voceTotaleBox}>
                    <Text style={styles.voceCostoLabel}>TOTALE</Text>
                    <Text style={styles.voceTotale}>
                      €{((parseFloat(v.quantita) || 1) * (parseFloat(v.costo) || 0)).toFixed(0)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}

            {/* Toggle IVA */}
            <View style={styles.ivaRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.ivaLabel}>Applica IVA 22%</Text>
                <Text style={styles.ivaSub}>
                  {includiIva ? 'Regime ordinario' : 'Regime forfettario / esente IVA'}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.ivaToggle, includiIva && styles.ivaToggleActive]}
                onPress={() => setIncludiIva(v => !v)}
              >
                <Text style={styles.ivaToggleText}>{includiIva ? 'ON' : 'OFF'}</Text>
              </TouchableOpacity>
            </View>

            {/* Riepilogo totali */}
            <View style={styles.riepilogo}>
              {includiIva && (
                <>
                  <View style={styles.riepilogoRow}>
                    <Text style={styles.riepilogoLabel}>Imponibile</Text>
                    <Text style={styles.riepilogoVal}>€{totale.toFixed(0)}</Text>
                  </View>
                  <View style={styles.riepilogoRow}>
                    <Text style={styles.riepilogoLabel}>IVA 22%</Text>
                    <Text style={styles.riepilogoVal}>€{(totale * 0.22).toFixed(0)}</Text>
                  </View>
                </>
              )}
              <View style={[styles.riepilogoRow, styles.riepilogoTotale]}>
                <Text style={styles.riepilogoTotaleLabel}>TOTALE</Text>
                <Text style={styles.riepilogoTotaleVal}>€{totaleConIva.toFixed(0)}</Text>
              </View>
              {!includiIva && <Text style={styles.forfettarioNote}>Operazione esente IVA — Regime Forfettario</Text>}
            </View>
          </View>
        )}

        {/* Card metodo di pagamento */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💳 Pagamento</Text>
          <Text style={styles.cardSub}>Come vuoi essere pagato</Text>
          <TouchableOpacity style={styles.dropdownBtn} onPress={() => setMostraModalPagamento(true)}>
            <Text style={styles.dropdownText}>{metodoPagamentoSelezionato ? metodoPagamentoSelezionato.nome : 'Scegli metodo di pagamento'}</Text>
            <Text style={styles.dropdownArrow}>⌄</Text>
          </TouchableOpacity>
          {metodiPagamento.length <= 1 && (
            <TouchableOpacity onPress={() => router.push('/screens/pagamenti')}>
              <Text style={{ fontSize: 13, color: '#0E9F8E', textAlign: 'center', paddingTop: 10 }}>Configura altri metodi di pagamento →</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Card trasferte */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={styles.cardTitle}>Trasferte e rimborsi</Text>
              <Text style={styles.cardSub}>Km e spese vive — esenti o imponibili</Text>
            </View>
            <Switch
              value={mostraTrasferte}
              onValueChange={setMostraTrasferte}
              trackColor={{ false: '#E5E7EB', true: '#0E9F8E' }}
              thumbColor="#fff"
            />
          </View>

          {mostraTrasferte && (
            <View style={{ gap: 10 }}>
              {trasferte.map(t => (
                <View key={t.id} style={{ backgroundColor: '#F7F8FA', borderRadius: 12, padding: 12, gap: 8, borderWidth: 1, borderColor: '#E5E7EB' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#0D1B2A' }}>
                      {t.tipo === 'km' ? `🚗 ${t.km} km` : `🧾 ${t.nome}`}
                    </Text>
                    <TouchableOpacity onPress={() => setTrasferte(ts => ts.filter(x => x.id !== t.id))}>
                      <Text style={{ color: '#9CA3AF', fontSize: 16 }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: '#6B7280' }}>€{t.importo}</Text>
                    <TouchableOpacity
                      style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: t.esente ? '#F0FDF4' : '#FEF3C7', borderWidth: 1, borderColor: t.esente ? '#0E9F8E' : '#F59E0B' }}
                      onPress={() => setTrasferte(ts => ts.map(x => x.id === t.id ? { ...x, esente: !x.esente } : x))}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '600', color: t.esente ? '#0E9F8E' : '#F59E0B' }}>
                        {t.esente ? 'Esente' : 'Imponibile'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {/* Rimborso km */}
              <View style={{ borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 10, gap: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.8 }}>RIMBORSO KM</Text>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Km percorsi"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="decimal-pad"
                    value={nuoviKm}
                    onChangeText={setNuoviKm}
                  />
                  <Text style={{ fontSize: 11, color: '#9CA3AF' }}>× €0.25</Text>
                  <TouchableOpacity
                    style={{ backgroundColor: '#0E9F8E', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}
                    onPress={() => {
                      const km = parseFloat(nuoviKm)
                      if (!km || km <= 0) { Alert.alert('Inserisci i km'); return }
                      const importo = (km * 0.25).toFixed(2)
                      setTrasferte(ts => [...ts, { id: Date.now().toString(), tipo: 'km', nome: 'Rimborso km', importo, km: nuoviKm, esente: true }])
                      setNuoviKm('')
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>+ Aggiungi</Text>
                  </TouchableOpacity>
                </View>
                <Text style={{ fontSize: 11, color: '#9CA3AF' }}>Tariffa ACI €0.25/km · Default: esente</Text>
              </View>

              {/* Spesa viva */}
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.8 }}>SPESA VIVA</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    style={[styles.input, { flex: 2 }]}
                    placeholder="es. Treno Milano"
                    placeholderTextColor="#9CA3AF"
                    value={nuovaSpesaNome}
                    onChangeText={setNuovaSpesaNome}
                  />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="€"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="decimal-pad"
                    value={nuovaSpesaImporto}
                    onChangeText={setNuovaSpesaImporto}
                  />
                </View>
                <TouchableOpacity
                  style={{ backgroundColor: '#F7F8FA', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' }}
                  onPress={() => {
                    if (!nuovaSpesaNome.trim() || !nuovaSpesaImporto) { Alert.alert('Inserisci nome e importo'); return }
                    setTrasferte(ts => [...ts, { id: Date.now().toString(), tipo: 'spesa', nome: nuovaSpesaNome.trim(), importo: nuovaSpesaImporto, esente: true }])
                    setNuovaSpesaNome('')
                    setNuovaSpesaImporto('')
                  }}
                >
                  <Text style={{ fontSize: 13, color: '#0E9F8E', fontWeight: '600' }}>+ Aggiungi spesa</Text>
                </TouchableOpacity>
              </View>

              {trasferte.length > 0 && (
                <View style={{ borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, color: '#6B7280' }}>Totale trasferte</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#0D1B2A' }}>
                    €{trasferte.reduce((a, t) => a + (parseFloat(t.importo) || 0), 0).toFixed(2)}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Note aggiuntive */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Note aggiuntive</Text>
          <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            value={noteExtra} onChangeText={setNoteExtra}
            placeholder="es. Incluso trasferta, pagamento 50% anticipato..."
            placeholderTextColor="#9CA3AF" multiline />
        </View>

        <TouchableOpacity style={[styles.generateBtn, voci.length === 0 && styles.generateBtnDisabled]} onPress={generaPDF} disabled={voci.length === 0}>
          <Text style={styles.generateBtnText}>
            📄 Genera PDF — €{totaleConIva % 1 === 0 ? totaleConIva.toFixed(0) : totaleConIva.toFixed(2)}
          </Text>
        </TouchableOpacity>

        {profiloFiscale && (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.cardTitle}>💰 Analisi fiscale</Text>
              <Switch value={mostraFiscale} onValueChange={setMostraFiscale}
                trackColor={{ false: '#E5E7EB', true: '#0E9F8E' }} thumbColor="#fff" />
            </View>
            {mostraFiscale && f && (
              <View style={styles.fiscaleBox}>
                {f.regime === 'forfettario' && (
                  <>
                    <View style={styles.fiscaleRow}>
                      <Text style={styles.fiscaleLabel}>Fatturato lordo</Text>
                      <Text style={styles.fiscaleVal}>€{fmt(f.lordo)}</Text>
                    </View>
                    {f.rivalsa > 0 && (
                      <View style={styles.fiscaleRow}>
                        <Text style={styles.fiscaleLabel}>{`+ Rivalsa INPS (${profiloFiscale.rivalsa_percentuale}%)`}</Text>
                        <Text style={styles.fiscaleVal}>+€{fmt(f.rivalsa)}</Text>
                      </View>
                    )}
                    <View style={styles.fiscaleRow}>
                      <Text style={styles.fiscaleLabel}>= Totale fattura cliente</Text>
                      <Text style={[styles.fiscaleVal, { fontWeight: '700' }]}>€{fmt(f.totaleCliente)}</Text>
                    </View>
                    <View style={styles.fiscaleSep} />
                    <View style={styles.fiscaleRow}>
                      <Text style={styles.fiscaleLabel}>{`Reddito imponibile (${profiloFiscale.coefficiente_redditivita}%)`}</Text>
                      <Text style={styles.fiscaleVal}>€{fmt(f.imponibile)}</Text>
                    </View>
                    <View style={styles.fiscaleRow}>
                      <Text style={styles.fiscaleLabel}>- Contributi INPS</Text>
                      <Text style={styles.fiscaleNeg}>-€{fmt(f.contributi)}</Text>
                    </View>
                    <View style={styles.fiscaleRow}>
                      <Text style={styles.fiscaleLabel}>{`- Imposta sostitutiva (${profiloFiscale.aliquota_sostitutiva}%)`}</Text>
                      <Text style={styles.fiscaleNeg}>-€{fmt(f.imposta)}</Text>
                    </View>
                    <View style={styles.fiscaleSep} />
                    <View style={styles.fiscaleRow}>
                      <Text style={styles.fiscaleNetto}>Netto stimato</Text>
                      <Text style={styles.fiscaleNettoVal}>€{fmt(f.netto)}</Text>
                    </View>
                  </>
                )}
                {f.regime === 'ordinario' && (
                  <>
                    <View style={styles.fiscaleRow}>
                      <Text style={styles.fiscaleLabel}>Fatturato lordo</Text>
                      <Text style={styles.fiscaleVal}>€{fmt(f.lordo)}</Text>
                    </View>
                    {f.iva > 0 && (
                      <View style={styles.fiscaleRow}>
                        <Text style={styles.fiscaleLabel}>{`+ IVA (${profiloFiscale.aliquota_iva}%)`}</Text>
                        <Text style={styles.fiscaleVal}>+€{fmt(f.iva)}</Text>
                      </View>
                    )}
                    {f.rivalsa > 0 && (
                      <View style={styles.fiscaleRow}>
                        <Text style={styles.fiscaleLabel}>+ Rivalsa INPS</Text>
                        <Text style={styles.fiscaleVal}>+€{fmt(f.rivalsa)}</Text>
                      </View>
                    )}
                    <View style={styles.fiscaleRow}>
                      <Text style={styles.fiscaleLabel}>= Totale fattura cliente</Text>
                      <Text style={[styles.fiscaleVal, { fontWeight: '700' }]}>€{fmt(f.totaleCliente)}</Text>
                    </View>
                    <View style={styles.fiscaleSep} />
                    <View style={styles.fiscaleRow}>
                      <Text style={styles.fiscaleLabel}>- Contributi INPS</Text>
                      <Text style={styles.fiscaleNeg}>-€{fmt(f.contributi)}</Text>
                    </View>
                    <View style={styles.fiscaleRow}>
                      <Text style={styles.fiscaleLabel}>- IRPEF stimata</Text>
                      <Text style={styles.fiscaleNeg}>-€{fmt(f.irpef)}</Text>
                    </View>
                    <View style={styles.fiscaleSep} />
                    <View style={styles.fiscaleRow}>
                      <Text style={styles.fiscaleNetto}>Netto stimato</Text>
                      <Text style={styles.fiscaleNettoVal}>€{fmt(f.netto)}</Text>
                    </View>
                  </>
                )}
                {f.regime === 'occasionale' && (
                  <>
                    <View style={styles.fiscaleRow}>
                      <Text style={styles.fiscaleLabel}>Compenso lordo</Text>
                      <Text style={styles.fiscaleVal}>€{fmt(f.lordo)}</Text>
                    </View>
                    <View style={styles.fiscaleRow}>
                      <Text style={styles.fiscaleLabel}>{`- Ritenuta d'acconto (${profiloFiscale.ritenuta_acconto}%)`}</Text>
                      <Text style={styles.fiscaleNeg}>-€{fmt(f.ritenuta)}</Text>
                    </View>
                    <View style={styles.fiscaleSep} />
                    <View style={styles.fiscaleRow}>
                      <Text style={styles.fiscaleNetto}>Netto stimato</Text>
                      <Text style={styles.fiscaleNettoVal}>€{fmt(f.netto)}</Text>
                    </View>
                  </>
                )}
                <Text style={styles.fiscaleDisclaimer}>⚠️ Calcolo indicativo — consulta il tuo commercialista</Text>

                {/* Calcolo inverso inline */}
                <View style={styles.fiscaleSep} />
                <Text style={[styles.fiscaleLabel, { marginBottom: 4 }]}>🧮 Voglio incassare (netto)</Text>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <TextInput
                    style={[styles.voceCostoInput, { flex: 1, fontSize: 14 }]}
                    value={nettoDesiderato}
                    onChangeText={v => { setNettoDesiderato(v); setLordoCalcolato(null) }}
                    placeholder="es. 2000"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="decimal-pad"
                  />
                  <TouchableOpacity
                    style={[styles.generateBtn, { paddingVertical: 10, paddingHorizontal: 14 }]}
                    onPress={() => {
                      const netto = parseFloat(nettoDesiderato.replace(',', '.'))
                      if (!netto || netto <= 0) { Alert.alert('Inserisci un valore valido'); return }
                      const lordo = calcolaLordoDaNetto(netto)
                      setLordoCalcolato(lordo)
                    }}
                  >
                    <Text style={[styles.generateBtnText, { fontSize: 13 }]}>Calcola</Text>
                  </TouchableOpacity>
                </View>
                {lordomCalcolato !== null && voci.length > 0 && (
                  <View style={{ backgroundColor: '#F0FDF4', borderRadius: 10, padding: 12, gap: 6, marginTop: 4 }}>
                    <Text style={{ fontSize: 12, color: '#065F46', fontWeight: '600' }}>
                      Lordo da fatturare: €{lordomCalcolato.toFixed(0)}
                    </Text>
                    <TouchableOpacity
                      style={[styles.generateBtn, { backgroundColor: '#0E9F8E', paddingVertical: 10 }]}
                      onPress={() => {
                        if (voci.length === 0) { Alert.alert('Aggiungi servizi prima'); return }
                        const totaleAttuale = calcolaTotale()
                        if (totaleAttuale === 0) { Alert.alert('I prezzi sono tutti a zero'); return }
                        const fattore = lordomCalcolato / totaleAttuale
                        setStoricoVoci(s => [...s, voci])
                        setVoci(v => v.map(x => ({
                          ...x,
                          costo: (Math.round((parseFloat(x.costo) || 0) * fattore)).toString()
                        })))
                        setLordoCalcolato(null)
                        setNettoDesiderato('')
                      }}
                    >
                      <Text style={[styles.generateBtnText, { fontSize: 13 }]}>✓ Applica al preventivo</Text>
                    </TouchableOpacity>
                    <Text style={{ fontSize: 10, color: '#9CA3AF', textAlign: 'center' }}>
                      I prezzi delle voci verranno scalati proporzionalmente
                    </Text>
                  </View>
                )}
                {storicoVoci.length > 0 && (
                  <TouchableOpacity
                    style={{ alignItems: 'center', padding: 8 }}
                    onPress={() => {
                      const precedente = storicoVoci[storicoVoci.length - 1]
                      setVoci(precedente)
                      setStoricoVoci(s => s.slice(0, -1))
                      setLordoCalcolato(null)
                      setNettoDesiderato('')
                    }}
                  >
                    <Text style={{ fontSize: 13, color: '#9CA3AF' }}>↩ Annulla ultimo calcolo ({storicoVoci.length} step)</Text>
                  </TouchableOpacity>
                )}
                {lordomCalcolato !== null && voci.length === 0 && (
                  <Text style={{ fontSize: 12, color: '#0E9F8E', marginTop: 4 }}>
                    Lordo da fatturare: €{lordomCalcolato.toFixed(0)} — aggiungi servizi per applicare
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={mostraModalPagamento} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setMostraModalPagamento(false)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>Metodo pagamento</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
            {metodiPagamento.map(m => (
              <TouchableOpacity key={m.id} style={[styles.clienteItem, metodoPagamentoSelezionato?.id === m.id && styles.clienteItemActive]} onPress={() => { setMetodoPagamentoSelezionato(m); setMostraModalPagamento(false) }}>
                <Text style={{ fontSize: 20 }}>{m.tipo === 'bonifico' ? '🏦' : m.tipo === 'paypal' ? '💙' : m.tipo === 'contanti' ? '💵' : m.tipo === 'stripe' ? '🔗' : '💳'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.clienteSelezionatoNome}>{m.nome}</Text>
                  {m.tipo === 'bonifico' && m.dati?.iban && <Text style={styles.clienteSelezionatoInfo}>{m.dati.iban}</Text>}
                  {m.tipo === 'paypal' && m.dati?.email && <Text style={styles.clienteSelezionatoInfo}>{m.dati.email}</Text>}
                </View>
                {metodoPagamentoSelezionato?.id === m.id && <Text style={{ color: '#0E9F8E', fontSize: 16, fontWeight: '700' }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Modal selezione/creazione cliente */}
      <Modal visible={mostraModalCliente} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Cliente</Text>
            <TouchableOpacity onPress={() => setMostraModalCliente(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalTabs}>
            {(['esistente', 'nuovo'] as const).map(tab => (
              <TouchableOpacity key={tab} style={[styles.modalTab, modalTab === tab && styles.modalTabActive]}
                onPress={() => setModalTab(tab)}>
                <Text style={[styles.modalTabText, modalTab === tab && styles.modalTabTextActive]}>
                  {tab === 'esistente' ? 'Cliente esistente' : 'Nuovo cliente'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {modalTab === 'esistente' ? (
            <View style={{ flex: 1 }}>
              <View style={{ padding: 16, paddingBottom: 8 }}>
                <TextInput
                  style={styles.input}
                  value={ricercaCliente}
                  onChangeText={setRicercaCliente}
                  placeholder="Cerca cliente..."
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <FlatList
                data={clienti.filter(c => c.nome.toLowerCase().includes(ricercaCliente.toLowerCase()))}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: 16, paddingTop: 8, gap: 8 }}
                ListEmptyComponent={
                  <View style={{ alignItems: 'center', paddingTop: 40 }}>
                    <Text style={{ fontSize: 14, color: '#9CA3AF' }}>Nessun cliente trovato</Text>
                    <TouchableOpacity onPress={() => setModalTab('nuovo')} style={{ marginTop: 8 }}>
                      <Text style={{ fontSize: 14, color: '#0E9F8E', fontWeight: '600' }}>Aggiungi nuovo →</Text>
                    </TouchableOpacity>
                  </View>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.clienteItem, clienteSelezionato?.id === item.id && styles.clienteItemActive]}
                    onPress={() => { setClienteSelezionato(item); setMostraModalCliente(false) }}
                  >
                    <View style={styles.clienteItemAvatar}>
                      <Text style={styles.clienteItemAvatarText}>{item.nome.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.clienteItemNome}>{item.nome}</Text>
                      {item.email ? <Text style={{ fontSize: 12, color: '#9CA3AF' }}>{item.email}</Text> : null}
                    </View>
                    {clienteSelezionato?.id === item.id && <Text style={{ color: '#0E9F8E', fontSize: 16 }}>✓</Text>}
                  </TouchableOpacity>
                )}
              />
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
              <Text style={styles.modalFieldLabel}>NOME *</Text>
              <TextInput style={styles.modalFieldInput} value={nuovoCliente.nome}
                onChangeText={v => setNuovoCliente(c => ({...c, nome: v}))}
                placeholder="es. Mario Rossi" placeholderTextColor="#9CA3AF" autoFocus />
              <Text style={styles.modalFieldLabel}>TELEFONO</Text>
              <TextInput style={styles.modalFieldInput} value={nuovoCliente.telefono}
                onChangeText={v => setNuovoCliente(c => ({...c, telefono: v}))}
                placeholder="es. 339 1234567" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" />
              <Text style={styles.modalFieldLabel}>EMAIL</Text>
              <TextInput style={styles.modalFieldInput} value={nuovoCliente.email}
                onChangeText={v => setNuovoCliente(c => ({...c, email: v}))}
                placeholder="es. mario@gmail.com" placeholderTextColor="#9CA3AF" keyboardType="email-address" autoCapitalize="none" />
              <Text style={styles.modalFieldLabel}>INDIRIZZO</Text>
              <TextInput style={styles.modalFieldInput} value={nuovoCliente.indirizzo}
                onChangeText={v => setNuovoCliente(c => ({...c, indirizzo: v}))}
                placeholder="es. Via Roma 1, Milano" placeholderTextColor="#9CA3AF" />
              <TouchableOpacity
                style={[styles.generateBtn, (!nuovoCliente.nome.trim() || salvandoCliente) && styles.generateBtnDisabled]}
                onPress={salvaESelezionaCliente}
                disabled={!nuovoCliente.nome.trim() || salvandoCliente}
              >
                {salvandoCliente
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.generateBtnText}>Salva e seleziona</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity style={{ alignItems: 'center', padding: 8 }} onPress={() => setMostraModalCliente(false)}>
                <Text style={{ fontSize: 13, color: '#9CA3AF' }}>Continua senza cliente</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Modal calcolo inverso netto */}
      <Modal visible={mostraCalcoloInverso} transparent animationType="fade" onRequestClose={() => setMostraCalcoloInverso(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMostraCalcoloInverso(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>🧮 Calcolo inverso netto</Text>
              <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 16, textAlign: 'center' }}>
                Inserisci quanto vuoi guadagnare — calcolo il lordo da fatturare
              </Text>
              <Text style={styles.modalFieldLabel}>NETTO DESIDERATO (€)</Text>
              <TextInput
                style={styles.modalFieldInput}
                value={nettoDesiderato}
                onChangeText={v => { setNettoDesiderato(v); setLordoCalcolato(null) }}
                placeholder="es. 2000"
                placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad"
                autoFocus
              />
              <TouchableOpacity
                style={[styles.generateBtn, { marginTop: 12 }]}
                onPress={() => {
                  const netto = parseFloat(nettoDesiderato.replace(',', '.'))
                  if (!netto || netto <= 0) { Alert.alert('Inserisci un valore valido'); return }
                  const lordo = calcolaLordoDaNetto(netto)
                  setLordoCalcolato(lordo)
                }}
              >
                <Text style={styles.generateBtnText}>Calcola</Text>
              </TouchableOpacity>
              {lordomCalcolato !== null && (
                <View style={{ marginTop: 16, backgroundColor: '#F0FDF4', borderRadius: 12, padding: 16, gap: 6 }}>
                  <Text style={{ fontSize: 12, color: '#065F46', fontWeight: '600', textAlign: 'center' }}>
                    Per incassare €{parseFloat(nettoDesiderato).toFixed(0)} netti devi fatturare:
                  </Text>
                  <Text style={{ fontSize: 28, fontWeight: '700', color: '#0E9F8E', textAlign: 'center' }}>
                    €{lordomCalcolato.toFixed(0)}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center' }}>
                    Regime {profiloFiscale?.regime} · calcolo indicativo
                  </Text>
                </View>
              )}
              <TouchableOpacity style={{ marginTop: 12, alignItems: 'center' }} onPress={() => setMostraCalcoloInverso(false)}>
                <Text style={{ fontSize: 13, color: '#9CA3AF' }}>Chiudi</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  header: { backgroundColor: '#0D1B2A', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { padding: 4, width: 50 },
  backText: { color: '#9CA3AF', fontSize: 22 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#0D1B2A' },
  cardSub: { fontSize: 12, color: '#9CA3AF', marginTop: -6 },
  input: { backgroundColor: '#F7F8FA', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 12, fontSize: 14, color: '#0D1B2A' },
  emptyText: { fontSize: 13, color: '#0E9F8E', textAlign: 'center' as const, padding: 16 },
  servizioRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  servizioNome: { fontSize: 14, fontWeight: '500', color: '#0D1B2A' },
  servizioCosto: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  addBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#0E9F8E', justifyContent: 'center', alignItems: 'center' },
  addBtnDone: { backgroundColor: '#D1FAE5' },
  addBtnText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  voceRow: { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10, gap: 8 },
  voceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  voceNome: { fontSize: 14, fontWeight: '600', color: '#0D1B2A' },
  voceRemove: { fontSize: 16, color: '#9CA3AF', padding: 4 },
  voceDesc: { backgroundColor: '#F7F8FA', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', padding: 8, fontSize: 12, color: '#374151' },
  voceCostoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  voceCostoBox: { flex: 1, gap: 2 },
  voceCostoLabel: { fontSize: 9, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.5 },
  voceCostoInput: { backgroundColor: '#F7F8FA', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', padding: 8, fontSize: 14, color: '#0D1B2A', textAlign: 'center' as const, fontWeight: '600' as const },
  voceMoltiply: { fontSize: 16, color: '#9CA3AF', marginTop: 12 },
  voceUguale: { fontSize: 16, color: '#9CA3AF', marginTop: 12 },
  voceTotaleBox: { flex: 1, gap: 2 },
  voceTotale: { fontSize: 16, fontWeight: '700', color: '#0E9F8E', textAlign: 'center' as const, paddingVertical: 8 },
  riepilogo: { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 10, gap: 6 },
  riepilogoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  riepilogoLabel: { fontSize: 13, color: '#6B7280' },
  riepilogoVal: { fontSize: 13, color: '#374151' },
  riepilogoTotale: { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 8, marginTop: 4 },
  riepilogoTotaleLabel: { fontSize: 15, fontWeight: '700', color: '#0D1B2A' },
  riepilogoTotaleVal: { fontSize: 18, fontWeight: '700', color: '#0E9F8E' },
  generateBtn: { backgroundColor: '#0D1B2A', borderRadius: 16, padding: 16, alignItems: 'center' as const },
  generateBtnDisabled: { opacity: 0.4 },
  generateBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  dropdownBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F7F8FA', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 12 },
  dropdownText: { fontSize: 14, color: '#0D1B2A', fontWeight: '500' },
  dropdownArrow: { fontSize: 18, color: '#9CA3AF' },
  ivaRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  ivaLabel: { fontSize: 14, fontWeight: '500', color: '#0D1B2A' },
  ivaSub: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  ivaToggle: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  ivaToggleActive: { backgroundColor: '#0D1B2A', borderColor: '#0D1B2A' },
  ivaToggleText: { fontSize: 12, fontWeight: '700' as const, color: '#fff' },
  forfettarioNote: { fontSize: 11, color: '#0E9F8E', fontStyle: 'italic' as const, marginTop: 4 },
  fiscaleBox: { gap: 6 },
  fiscaleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  fiscaleLabel: { fontSize: 12, color: '#6B7280', flex: 1 },
  fiscaleVal: { fontSize: 13, color: '#374151' },
  fiscaleNeg: { fontSize: 13, color: '#EF4444' },
  fiscaleSep: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 4 },
  fiscaleNetto: { fontSize: 14, fontWeight: '700', color: '#0D1B2A', flex: 1 },
  fiscaleNettoVal: { fontSize: 16, fontWeight: '700', color: '#0E9F8E' },
  fiscaleDisclaimer: { fontSize: 10, color: '#9CA3AF', fontStyle: 'italic' as const, marginTop: 6 },
  ivaToggleDisabled: { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB', opacity: 0.6 },
  clienteSelezionatoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#0E9F8E' },
  clienteSelezionatoNome: { fontSize: 14, fontWeight: '600', color: '#0D1B2A' },
  clienteSelezionatoInfo: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  clienteAggiungiBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F7F8FA', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed' as const },
  clienteAggiungiIcon: { fontSize: 20, color: '#0E9F8E', fontWeight: '600' },
  clienteAggiungiText: { fontSize: 14, color: '#6B7280' },
  modalContainer: { flex: 1, backgroundColor: '#F7F8FA' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56, backgroundColor: '#0D1B2A' },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalClose: { color: '#9CA3AF', fontSize: 20 },
  modalTabs: { flexDirection: 'row', backgroundColor: '#fff', margin: 16, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: '#E5E7EB' },
  modalTab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' as const },
  modalTabActive: { backgroundColor: '#0D1B2A' },
  modalTabText: { fontSize: 13, fontWeight: '500', color: '#9CA3AF' },
  modalTabTextActive: { color: '#fff' },
  modalFieldLabel: { fontSize: 11, fontWeight: '600' as const, color: '#9CA3AF', letterSpacing: 0.8 },
  modalFieldInput: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 12, fontSize: 14, color: '#0D1B2A' },
  clienteItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  clienteItemActive: { borderColor: '#0E9F8E', backgroundColor: '#F0FDF4' },
  clienteItemAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#0D1B2A', justifyContent: 'center', alignItems: 'center' },
  clienteItemAvatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  clienteItemNome: { fontSize: 14, fontWeight: '500', color: '#0D1B2A' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center' as const, alignItems: 'center' as const, padding: 24 },
  modalBox: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', gap: 8 },
})
