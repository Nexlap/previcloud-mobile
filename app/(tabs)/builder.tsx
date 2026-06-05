/* eslint-disable @typescript-eslint/no-explicit-any */
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { supabase } from '../../lib/supabase';

interface Servizio {
  id: string; nome: string; descrizione: string; costo: number | null; unita: string
}
interface VocePreventivo {
  servizio_id: string; nome: string; descrizione: string; costo: string; quantita: string; unita: string
}
interface RisultatoFiscale {
  regime: string; lordo: number; netto: number
  rivalsa: number; totaleCliente: number; imponibile: number
  contributi: number; imposta: number; iva: number; irpef: number; ritenuta: number
}

interface Cliente {
  id: string
  nome: string
  telefono: string | null
  email: string | null
  indirizzo: string | null
}

const builderState = {
  voci: [] as VocePreventivo[],
  nomeCliente: '',
  noteExtra: '',
  includiIva: true,
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
  const [ricercaCliente, setRicercaCliente] = useState('')

  useEffect(() => { caricaServizi(); caricaProfiloFiscale(); caricaClienti() }, [])
  useEffect(() => {
  builderState.voci = voci
  builderState.nomeCliente = nomeCliente
  builderState.noteExtra = noteExtra
  builderState.includiIva = includiIva
}, [voci, nomeCliente, noteExtra, includiIva])

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
    const lordo = calcolaTotale()
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
    const totale = calcolaTotale()
    let testo = `PREVENTIVO\nData: ${oggi}  |  Validità: 30 giorni\n`
    if (nomeCliente) testo += `Cliente: ${nomeCliente}\n`
    testo += `\nVOCI:\n`
    voci.forEach(v => {
      const qty = parseFloat(v.quantita) || 1
      const costo = parseFloat(v.costo) || 0
      testo += `- ${v.nome}`
      if (v.descrizione) testo += `: ${v.descrizione}`
      testo += ` — ${qty > 1 ? `${qty}x ` : ''}€${costo}/${v.unita} = €${(qty * costo).toFixed(0)}\n`
    })
    if (includiIva) {
      testo += `\nImponibile: €${totale.toFixed(0)}\nIVA 22%: €${(totale * 0.22).toFixed(0)}\n─────────────────\nTOTALE: €${(totale * 1.22).toFixed(0)}\n`
    } else {
      testo += `\n─────────────────\nTOTALE: €${totale.toFixed(0)}\n(Operazione esente IVA - Regime Forfettario)\n`
    }
    if (noteExtra) testo += `\nNote: ${noteExtra}`
    return testo
  }

  function generaPDF() {
    if (voci.length === 0) { Alert.alert('Preventivo vuoto', 'Aggiungi almeno un servizio.'); return }
    router.push({
      pathname: '/(tabs)/preventivo-pdf',
      params: {
        testo: generaTestoPreventivo(),
        cliente_id: clienteSelezionato?.id || '',
      }
    })
  }

  const totale = calcolaTotale()
  const f = calcolaFiscale()

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Builder preventivo</Text>
        <TouchableOpacity onPress={() => {
  builderState.voci = []
  builderState.nomeCliente = ''
  builderState.noteExtra = ''
  builderState.includiIva = true
  setVoci([])
  setNomeCliente('')
  setNoteExtra('')
  setIncludiIva(true)
}}>
  <Text style={{ color: '#9CA3AF', fontSize: 13 }}>🗑 Svuota</Text>
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

<View style={styles.ivaRow}>
  <View style={{ flex: 1 }}>
    <Text style={styles.ivaLabel}>Applica IVA 22%</Text>
    <Text style={styles.ivaSub}>
      {profiloFiscale && mostraFiscale
        ? 'Gestita dal regime fiscale attivo'
        : includiIva ? 'Regime ordinario' : 'Regime forfettario'}
    </Text>
  </View>
  <TouchableOpacity
    style={[styles.ivaToggle, (profiloFiscale && mostraFiscale) ? styles.ivaToggleDisabled : includiIva && styles.ivaToggleActive]}
    onPress={() => { if (!profiloFiscale || !mostraFiscale) setIncludiIva(v => !v) }}
  >
    <Text style={styles.ivaToggleText}>
      {(profiloFiscale && mostraFiscale) ? 'AUTO' : includiIva ? 'ON' : 'OFF'}
    </Text>
  </TouchableOpacity>
</View>
<View style={styles.riepilogo}>
{(!profiloFiscale || !mostraFiscale) && includiIva && (    <>
      <View style={styles.riepilogoRow}>
        <Text style={styles.riepilogoLabel}>Imponibile</Text>
        <Text style={styles.riepilogoVal}>€{totale.toFixed(0)}</Text>
      </View>
      <View style={styles.riepilogoRow}>
        <Text style={styles.riepilogoLabel}>IVA 22%</Text>
        <Text style={styles.riepilogoVal}>€{(totale * 0.22).toFixed(0)}</Text>
      </View>
    </>
  )}              <View style={[styles.riepilogoRow, styles.riepilogoTotale]}>
                <Text style={styles.riepilogoTotaleLabel}>TOTALE</Text>
                <Text style={styles.riepilogoTotaleVal}>€{(profiloFiscale && mostraFiscale) ? totale.toFixed(0) : includiIva ? (totale * 1.22).toFixed(0) : totale.toFixed(0)}</Text>
              </View>
              {(!profiloFiscale || !mostraFiscale) && !includiIva && <Text style={styles.forfettarioNote}>Operazione esente IVA — Regime Forfettario</Text>}
            </View>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Note aggiuntive</Text>
          <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            value={noteExtra} onChangeText={setNoteExtra}
            placeholder="es. Incluso trasferta, pagamento 50% anticipato..."
            placeholderTextColor="#9CA3AF" multiline />
        </View>

        <TouchableOpacity style={[styles.generateBtn, voci.length === 0 && styles.generateBtnDisabled]} onPress={generaPDF} disabled={voci.length === 0}>
          <Text style={styles.generateBtnText}>
            📄 Genera PDF — €{includiIva ? (totale * 1.22).toFixed(0) : totale.toFixed(0)}
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
                      <Text style={styles.fiscaleVal}>€{f.lordo.toFixed(0)}</Text>
                    </View>
                    {f.rivalsa > 0 && (
                      <View style={styles.fiscaleRow}>
                        <Text style={styles.fiscaleLabel}>+ Rivalsa INPS ({profiloFiscale.rivalsa_percentuale}%)</Text>
                        <Text style={styles.fiscaleVal}>+€{f.rivalsa.toFixed(0)}</Text>
                      </View>
                    )}
                    <View style={styles.fiscaleRow}>
                      <Text style={styles.fiscaleLabel}>= Totale fattura cliente</Text>
                      <Text style={[styles.fiscaleVal, { fontWeight: '700' }]}>€{f.totaleCliente.toFixed(0)}</Text>
                    </View>
                    <View style={styles.fiscaleSep} />
                    <View style={styles.fiscaleRow}>
                      <Text style={styles.fiscaleLabel}>Reddito imponibile ({profiloFiscale.coefficiente_redditivita}%)</Text>
                      <Text style={styles.fiscaleVal}>€{f.imponibile.toFixed(0)}</Text>
                    </View>
                    <View style={styles.fiscaleRow}>
                      <Text style={styles.fiscaleLabel}>- Contributi INPS</Text>
                      <Text style={styles.fiscaleNeg}>-€{f.contributi.toFixed(0)}</Text>
                    </View>
                    <View style={styles.fiscaleRow}>
                      <Text style={styles.fiscaleLabel}>- Imposta sostitutiva ({profiloFiscale.aliquota_sostitutiva}%)</Text>
                      <Text style={styles.fiscaleNeg}>-€{f.imposta.toFixed(0)}</Text>
                    </View>
                    <View style={styles.fiscaleSep} />
                    <View style={styles.fiscaleRow}>
                      <Text style={styles.fiscaleNetto}>Netto stimato</Text>
                      <Text style={styles.fiscaleNettoVal}>€{f.netto.toFixed(0)}</Text>
                    </View>
                  </>
                )}
                {f.regime === 'ordinario' && (
                  <>
                    <View style={styles.fiscaleRow}>
                      <Text style={styles.fiscaleLabel}>Fatturato lordo</Text>
                      <Text style={styles.fiscaleVal}>€{f.lordo.toFixed(0)}</Text>
                    </View>
                    {f.iva > 0 && (
                      <View style={styles.fiscaleRow}>
                        <Text style={styles.fiscaleLabel}>+ IVA ({profiloFiscale.aliquota_iva}%)</Text>
                        <Text style={styles.fiscaleVal}>+€{f.iva.toFixed(0)}</Text>
                      </View>
                    )}
                    {f.rivalsa > 0 && (
                      <View style={styles.fiscaleRow}>
                        <Text style={styles.fiscaleLabel}>+ Rivalsa INPS</Text>
                        <Text style={styles.fiscaleVal}>+€{f.rivalsa.toFixed(0)}</Text>
                      </View>
                    )}
                    <View style={styles.fiscaleRow}>
                      <Text style={styles.fiscaleLabel}>= Totale fattura cliente</Text>
                      <Text style={[styles.fiscaleVal, { fontWeight: '700' }]}>€{f.totaleCliente.toFixed(0)}</Text>
                    </View>
                    <View style={styles.fiscaleSep} />
                    <View style={styles.fiscaleRow}>
                      <Text style={styles.fiscaleLabel}>- Contributi INPS</Text>
                      <Text style={styles.fiscaleNeg}>-€{f.contributi.toFixed(0)}</Text>
                    </View>
                    <View style={styles.fiscaleRow}>
                      <Text style={styles.fiscaleLabel}>- IRPEF stimata</Text>
                      <Text style={styles.fiscaleNeg}>-€{f.irpef.toFixed(0)}</Text>
                    </View>
                    <View style={styles.fiscaleSep} />
                    <View style={styles.fiscaleRow}>
                      <Text style={styles.fiscaleNetto}>Netto stimato</Text>
                      <Text style={styles.fiscaleNettoVal}>€{f.netto.toFixed(0)}</Text>
                    </View>
                  </>
                )}
                {f.regime === 'occasionale' && (
                  <>
                    <View style={styles.fiscaleRow}>
                      <Text style={styles.fiscaleLabel}>Compenso lordo</Text>
                      <Text style={styles.fiscaleVal}>€{f.lordo.toFixed(0)}</Text>
                    </View>
                    <View style={styles.fiscaleRow}>
                      <Text style={styles.fiscaleLabel}>- Ritenuta d'acconto ({profiloFiscale.ritenuta_acconto}%)</Text>
                      <Text style={styles.fiscaleNeg}>-€{f.ritenuta.toFixed(0)}</Text>
                    </View>
                    <View style={styles.fiscaleSep} />
                    <View style={styles.fiscaleRow}>
                      <Text style={styles.fiscaleNetto}>Netto stimato</Text>
                      <Text style={styles.fiscaleNettoVal}>€{f.netto.toFixed(0)}</Text>
                    </View>
                  </>
                )}
                <Text style={styles.fiscaleDisclaimer}>⚠️ Calcolo indicativo — consulta il tuo commercialista</Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

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
})