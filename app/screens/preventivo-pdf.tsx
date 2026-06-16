import * as FileSystem from 'expo-file-system/legacy'
import { router, useLocalSearchParams } from 'expo-router'
import * as Sharing from 'expo-sharing'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator, Alert, Animated, FlatList, Modal,
  ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View
} from 'react-native'
import WebView from 'react-native-webview'
import { creaLinkPagamento, generaPDF as generaPDFApi, generaPDFFile, salvaPDF as salvaPDFApi } from "../../lib/api/pdf"
import { TEMPLATES } from "../../lib/constants"
import { eventBus } from '../../lib/eventBus'
import { supabase } from "../../lib/supabase"
import { trackEvento } from "../../lib/utils/analytics"

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
  const [clienti, setClienti] = useState<{ id: string, nome: string }[]>([])
  const [clienteSelezionato, setClienteSelezionato] = useState<{ id: string, nome: string } | null>(null)
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
  const [metodiPagamento, setMetodiPagamento] = useState<any[]>([])
  const [metodoPagamentoSelezionato, setMetodoPagamentoSelezionato] = useState<any | null>(null)
  const [mostraModalPagamento, setMostraModalPagamento] = useState(false)
  const [abbonamentoAttivo, setAbbonamentoAttivo] = useState(false)
  const [abImporto, setAbImporto] = useState('')
  const [abGiorno, setAbGiorno] = useState('1')
  const [abMensilita, setAbMensilita] = useState('')
  const [abVisibileNelPDF, setAbVisibileNelPDF] = useState(true)
  const toastOpacity = useRef(new Animated.Value(0)).current
  const previewTimeout = useRef<any>(null)
  const [segnaInviato, setSegnaInviato] = useState(false)

  useEffect(() => {
    trackEvento('preview_pdf_aperta', 'preventivo-pdf')
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/(auth)/login'); return }
      setToken(session.access_token)
    })
    caricaTemplatePref()
    caricaClienti()
    caricaMetodiPagamento()
  }, [])

  useEffect(() => {
    if (cliente_id) {
      supabase.from('clienti').select('id, nome').eq('id', cliente_id).single()
        .then(({ data }) => { if (data) setClienteSelezionato(data) })
    }
  }, [cliente_id])

  useEffect(() => {
    if (!token || !testo) return
    if (previewTimeout.current) clearTimeout(previewTimeout.current)
    previewTimeout.current = setTimeout(() => aggiornaPreview(), 300)
  }, [template, token, testo, clienteSelezionato, nascondiPrezzi, metodoPagamentoSelezionato, abbonamentoAttivo, abImporto, abVisibileNelPDF])

  function importoPreventivo() {
    const match = testo.match(/TOTALE[:\s]*?€?\s*([\d.,]+)/i)
    return match ? parseFloat(match[1].replace(',', '.')) : 0
  }

  async function testoConPagamento() {
    let testoBase = testo

    if (abbonamentoAttivo && abVisibileNelPDF && abImporto) {
      testoBase += `\nCANONE MENSILE: EUR ${abImporto}/mese`
    }

    if (!metodoPagamentoSelezionato) return testoBase
    const m = metodoPagamentoSelezionato
    if (m.tipo === 'stripe') {
      const link = await creaLinkPagamento(importoPreventivo(), 'Preventivo', token)
      return testoBase + `\nPAGAMENTO: Online con carta\nLINK PAGAMENTO: ${link}`
    }
    return testoBase + `\nPAGAMENTO: ${m.nome}${m.tipo === 'bonifico' && m.dati?.iban ? '\nIBAN: ' + m.dati.iban : ''}${m.tipo === 'paypal' && m.dati?.email ? '\nPayPal: ' + m.dati.email : ''}`
  }

  async function aggiornaPreview() {
    if (!token || !testo) return
    setCaricandoPreview(true)
    try {
      const data = await generaPDFApi({ testo: await testoConPagamento(), template, token, versione_padre_id: null, cliente_id: clienteSelezionato?.id || '', nascondi_prezzi: nascondiPrezzi })
      if (data.html) {
        const htmlScalato = data.html.replace('</head>', `
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <style>html{width:100%}body{transform-origin:top left;transform:scale(0.45);width:222%}</style>
        </head>`)
        setHtmlPreview(htmlScalato)
      }
    } catch (e) {
      console.log('Preview fallita:', e)
    }
    setCaricandoPreview(false)
  }

  async function caricaTemplatePref() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('template_preferito').eq('id', user.id).single()
    if (data?.template_preferito) setTemplate(data.template_preferito)
  }

  async function caricaClienti() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('clienti').select('id, nome').eq('user_id', user.id).order('nome')
    if (data) setClienti(data)
  }

  async function caricaMetodiPagamento() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('metodi_pagamento').select('*').eq('user_id', user.id).order('predefinito', { ascending: false })
    if (data) {
      setMetodiPagamento(data)
      const metodoDaParam = metodo_pagamento_id ? data.find((m: any) => m.id === metodo_pagamento_id) : null
      const predefinito = data.find((m: any) => m.predefinito)
      if (metodoDaParam || predefinito) setMetodoPagamentoSelezionato(metodoDaParam || predefinito)
    }
  }

  async function aggiungiESelezionaCliente() {
    if (!nuovoNomeCliente.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('clienti')
      .insert({ nome: nuovoNomeCliente.trim(), user_id: user.id })
      .select().single()
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
      const data = await generaPDFFile({ testo: await testoConPagamento(), template, token, versione_padre_id: versione_padre_id || null, cliente_id: clienteSelezionato?.id || '', nascondi_prezzi: nascondiPrezzi })
      const uri = `${FileSystem.cacheDirectory}preventivo-${Date.now()}.pdf`
      await FileSystem.writeAsStringAsync(uri, data.pdf_base64, { encoding: 'base64' as any })

      let pdfUrl = ''
      try {
        pdfUrl = await salvaPDFApi(data.pdf_base64, token)
      } catch (e) { console.log('Salvataggio PDF fallito:', e) }

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

      // Crea abbonamento automaticamente se attivo
if (abbonamentoAttivo && clienteSelezionato && idSalvato) {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const importo = parseFloat(abImporto.replace(',', '.'))
    const giorno = parseInt(abGiorno)
    const mensilita = abMensilita ? parseInt(abMensilita) : null
       if (importo > 0 && giorno >= 1 && giorno <= 31) {
      // Controlla se esiste già un abbonamento attivo
      const { data: abEsistente } = await supabase
        .from('abbonamenti')
        .select('id')
        .eq('cliente_id', clienteSelezionato.id)
        .eq('attivo', true)
        .single()

      if (abEsistente) {
        Alert.alert('Abbonamento esistente', `${clienteSelezionato.nome} ha già un abbonamento attivo. Gestiscilo dalla sua cartella cliente.`)
      } else {
      const { data: ab } = await supabase.from('abbonamenti').insert({
        user_id: user.id,
        cliente_id: clienteSelezionato.id,
        importo_default: importo,
        giorno_scadenza: giorno,
        attivo: true,
        preventivo_id: idSalvato,
        numero_mensilita: mensilita,
        tipo: mensilita ? 'rate' : 'canone'
      }).select().single()
            if (ab) {
              const ora = new Date()
              const inserimenti = mensilita
                ? Array.from({ length: mensilita }, (_, i) => {
                    const d = new Date(ora.getFullYear(), ora.getMonth() + i, 1)
                    return { abbonamento_id: ab.id, mese: d.getMonth() + 1, anno: d.getFullYear(), importo, acconto: 0, stato: 'da_incassare' }
                  })
                : [{ abbonamento_id: ab.id, mese: ora.getMonth() + 1, anno: ora.getFullYear(), importo, acconto: 0, stato: 'da_incassare' }]
              const { error: errRate } = await supabase.from('rate_abbonamento').insert(inserimenti)
              console.log('Rate inserite:', inserimenti.length, 'Errore:', errRate)
            }
          }
        }
        }
      }

      setTitolo(clienteSelezionato ? `Preventivo ${clienteSelezionato.nome}` : '')
      setTimeout(() => setMostraModalTitolo(true), 800)

    } catch (err: any) {
      Alert.alert('Errore', err.message)
    }
    setGenerando(false)
  }

  async function salvaSuSupabase(ver: number, titoloScelto: string, pdfUrl: string = ''): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const match = testo.match(/TOTALE[:\s]*?€?\s*([\d.,]+)/i)
    const importo = match ? parseFloat(match[1].replace(',', '.')) : null
    const { data } = await supabase.from('preventivi').insert({
      user_id: user.id,
      testo_preventivo: testo,
      template,
      versione: ver,
      preventivo_padre_id: versione_padre_id || null,
      is_ultimo: true,
      stato: 'bozza',
      cliente_id: clienteSelezionato?.id || null,
      nome_cliente: clienteSelezionato?.nome || null,
      titolo: titoloScelto,
      pdf_url: pdfUrl || null,
      importo_totale: importo
    }).select('id').single()
    return data?.id || null
  }

  async function aggiornaTitolo(nuovoTitolo: string) {
    if (!preventivoSalvatoId || !nuovoTitolo.trim()) return
    await supabase.from('preventivi').update({ titolo: nuovoTitolo }).eq('id', preventivoSalvatoId)
  }

  async function salvaTemplate(tmpl: string) {
    setTemplate(tmpl)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({ template_preferito: tmpl }).eq('id', user.id)
  }

  function mostraToast() {
    setToastVisible(true)
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(toastOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => setToastVisible(false))
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Preventivo</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16, gap: 14 }}>

        {/* Anteprima PDF */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={styles.cardTitle}>Anteprima PDF</Text>
            {caricandoPreview && <ActivityIndicator size="small" color="#0E9F8E" />}
          </View>
          <View style={styles.previewContainer}>
            {htmlPreview ? (
              <WebView
                source={{ html: htmlPreview }}
                style={styles.webview}
                scrollEnabled={true}
                scalesPageToFit={false}
                pinchGestureEnabled={false}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
              />
            ) : (
              <View style={styles.previewPlaceholder}>
                <ActivityIndicator size="large" color="#0E9F8E" />
                <Text style={styles.previewPlaceholderText}>Caricamento anteprima...</Text>
              </View>
            )}
          </View>
        </View>

        {/* Selezione template */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Scegli template</Text>
          <Text style={styles.cardSub}>L'anteprima si aggiorna in tempo reale</Text>
          <View style={styles.templateGrid}>
            {TEMPLATES.map(t => (
              <TouchableOpacity
                key={t.id}
                style={[styles.templateCard, template === t.id && styles.templateCardActive]}
                onPress={() => salvaTemplate(t.id)}
              >
                <Text style={styles.templateEmoji}>{t.emoji}</Text>
                <Text style={[styles.templateNome, template === t.id && styles.templateNomeActive]}>{t.nome}</Text>
                <Text style={styles.templateDesc}>{t.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Toggle tariffa a corpo */}
        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>Tariffa a corpo</Text>
            <Text style={styles.toggleSub}>Nasconde i prezzi delle singole voci - mostra solo il totale</Text>
          </View>
          <Switch
            value={nascondiPrezzi}
            onValueChange={setNascondiPrezzi}
            trackColor={{ false: '#E5E7EB', true: '#0E9F8E' }}
            thumbColor="#fff"
          />
        </View>

        {/* Toggle abbonamento mensile */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Abbonamento mensile</Text>
              <Text style={styles.cardSub}>Configura un canone ricorrente per questo cliente</Text>
            </View>
            <Switch
              value={abbonamentoAttivo}
              onValueChange={(v) => {
                setAbbonamentoAttivo(v)
                if (v && importo_totale) setAbImporto(importo_totale)
              }}
              trackColor={{ false: '#E5E7EB', true: '#0E9F8E' }}
              thumbColor="#fff"
            />
          </View>
          {abbonamentoAttivo && (
            <View style={{ gap: 10, marginTop: 8 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.abLabel}>IMPORTO MENSILE (EUR)</Text>
                  <TextInput
                    style={styles.abInput}
                    value={abImporto}
                    onChangeText={setAbImporto}
                    keyboardType="decimal-pad"
                    placeholder="es. 400"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.abLabel}>GIORNO SCADENZA</Text>
                  <TextInput
                    style={styles.abInput}
                    value={abGiorno}
                    onChangeText={setAbGiorno}
                    keyboardType="number-pad"
                    placeholder="es. 1"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
              <View>
                <Text style={styles.abLabel}>N. MENSILITA (opzionale)</Text>
                <TextInput
                  style={styles.abInput}
                  value={abMensilita}
                  onChangeText={setAbMensilita}
                  keyboardType="number-pad"
                  placeholder="es. 12 - lascia vuoto per canone aperto"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: '#0D1B2A' }}>Mostra nel PDF</Text>
                  <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>Aggiunge il canone mensile al documento</Text>
                </View>
                <Switch
                  value={abVisibileNelPDF}
                  onValueChange={setAbVisibileNelPDF}
                  trackColor={{ false: '#E5E7EB', true: '#0E9F8E' }}
                  thumbColor="#fff"
                />
              </View>
            </View>
          )}
        </View>

        {/* Cliente */}
        <TouchableOpacity style={styles.clienteBtn} onPress={() => setMostraModalCliente(true)}>
          <Text style={styles.clienteBtnIcon}>👤</Text>
          <View style={styles.clienteBtnBody}>
            <Text style={styles.clienteBtnLabel}>Cliente</Text>
            <Text style={styles.clienteBtnVal}>
              {clienteSelezionato ? clienteSelezionato.nome : 'Nessuno'}
            </Text>
          </View>
          <Text style={styles.clienteBtnArrow}>›</Text>
        </TouchableOpacity>

        {/* Card metodo pagamento */}
        {metodoPagamentoSelezionato && (
          <View style={styles.pagamentoInfo}>
            <Text style={styles.clienteBtnIcon}>💳</Text>
            <View style={styles.clienteBtnBody}>
              <Text style={styles.clienteBtnLabel}>Pagamento</Text>
              <Text style={styles.clienteBtnVal}>
                {metodoPagamentoSelezionato.tipo === 'stripe' ? 'Online con carta' : metodoPagamentoSelezionato.nome}
              </Text>
            </View>
          </View>
        )}

        {versione_padre_id && (
          <View style={styles.versionBox}>
            <Text style={styles.versionText}>
              Stai creando una nuova versione. La precedente rimane nello storico.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.generateBtn, (generando || !testo.trim()) && styles.generateBtnDisabled]}
          onPress={generaPDF}
          disabled={generando || !testo.trim()}
        >
          {generando
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.generateBtnText}>Genera PDF e condividi</Text>
          }
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Toast */}
      {toastVisible && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
          <Text style={styles.toastText}>Preventivo salvato</Text>
        </Animated.View>
      )}

      {/* Modal selezione metodo pagamento */}
      <Modal visible={mostraModalPagamento} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Metodo di pagamento</Text>
            <TouchableOpacity onPress={() => setMostraModalPagamento(false)}>
              <Text style={styles.modalClose}>x</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
            <TouchableOpacity
              style={[styles.clienteItem, !metodoPagamentoSelezionato && styles.clienteItemActive]}
              onPress={() => { setMetodoPagamentoSelezionato(null); setMostraModalPagamento(false) }}
            >
              <Text style={{ fontSize: 13, color: '#6B7280' }}>NO</Text>
              <Text style={[styles.clienteItemNome, { flex: 1 }]}>Nessun metodo</Text>
              {!metodoPagamentoSelezionato && <Text style={{ color: '#0E9F8E', fontSize: 13, fontWeight: '700' }}>OK</Text>}
            </TouchableOpacity>
            {metodiPagamento.length === 0 ? (
              <View style={{ alignItems: 'center', paddingTop: 40 }}>
                <Text style={{ fontSize: 14, color: '#9CA3AF' }}>Nessun metodo configurato</Text>
                <TouchableOpacity onPress={() => { setMostraModalPagamento(false); router.push('/screens/pagamenti') }} style={{ marginTop: 8 }}>
                  <Text style={{ fontSize: 14, color: '#0E9F8E', fontWeight: '600' }}>Configura nelle impostazioni</Text>
                </TouchableOpacity>
              </View>
            ) : (
              metodiPagamento.map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.clienteItem, metodoPagamentoSelezionato?.id === m.id && styles.clienteItemActive]}
                  onPress={() => { setMetodoPagamentoSelezionato(m); setMostraModalPagamento(false) }}
                >
                  <Text style={{ fontSize: 12, color: '#6B7280', width: 44 }}>{m.tipo.toUpperCase().slice(0, 4)}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.clienteItemNome}>{m.nome}</Text>
                    {m.tipo === 'bonifico' && m.dati?.iban && <Text style={{ fontSize: 12, color: '#9CA3AF' }}>{m.dati.iban}</Text>}
                    {m.tipo === 'paypal' && m.dati?.email && <Text style={{ fontSize: 12, color: '#9CA3AF' }}>{m.dati.email}</Text>}
                  </View>
                  {metodoPagamentoSelezionato?.id === m.id && <Text style={{ color: '#0E9F8E', fontSize: 13, fontWeight: '700' }}>OK</Text>}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Modal selezione cliente */}
      <Modal visible={mostraModalCliente} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>A chi e questo preventivo?</Text>
            <TouchableOpacity onPress={() => setMostraModalCliente(false)}>
              <Text style={styles.modalClose}>x</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalTabs}>
            {(['esistente', 'nuovo'] as const).map(t => (
              <TouchableOpacity key={t} style={[styles.modalTab, modalTab === t && styles.modalTabActive]} onPress={() => setModalTab(t)}>
                <Text style={[styles.modalTabText, modalTab === t && styles.modalTabTextActive]}>
                  {t === 'esistente' ? 'Cliente esistente' : 'Nuovo cliente'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {modalTab === 'esistente' ? (
            <FlatList
              data={clienti}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 16, gap: 8 }}
              ListEmptyComponent={
                <View style={styles.modalEmpty}>
                  <Text style={styles.modalEmptyText}>Nessun cliente ancora</Text>
                  <TouchableOpacity onPress={() => setModalTab('nuovo')}>
                    <Text style={styles.modalEmptyLink}>Aggiungi il primo</Text>
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
                  <Text style={styles.clienteItemNome}>{item.nome}</Text>
                  {clienteSelezionato?.id === item.id && <Text style={styles.clienteItemCheck}>OK</Text>}
                </TouchableOpacity>
              )}
            />
          ) : (
            <View style={styles.modalNewForm}>
              <Text style={styles.modalNewLabel}>NOME CLIENTE</Text>
              <TextInput
                style={styles.modalNewInput}
                value={nuovoNomeCliente}
                onChangeText={setNuovoNomeCliente}
                placeholder="es. Mario Rossi"
                placeholderTextColor="#9CA3AF"
                autoFocus
              />
              <TouchableOpacity
                style={[styles.modalNewBtn, !nuovoNomeCliente.trim() && styles.generateBtnDisabled]}
                onPress={aggiungiESelezionaCliente}
                disabled={!nuovoNomeCliente.trim()}
              >
                <Text style={styles.modalNewBtnText}>Aggiungi e seleziona</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSkipBtn} onPress={() => { setClienteSelezionato(null); setMostraModalCliente(false) }}>
                <Text style={styles.modalSkipText}>Salta - senza cliente</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* Modal rinomina preventivo */}
      <Modal visible={mostraModalTitolo} transparent animationType="fade">
        <View style={styles.titoloOverlay}>
          <View style={styles.titoloBox}>
            <Text style={styles.titoloTitle}>Preventivo salvato ✓</Text>
            <Text style={styles.titoloSub}>Puoi dargli un nome più preciso</Text>
            <TextInput
              style={styles.titoloInput}
              value={titolo}
              onChangeText={setTitolo}
              placeholder="es. Preventivo caldaia Mario"
              placeholderTextColor="#9CA3AF"
              autoFocus
            />
            <TouchableOpacity
              style={styles.inviataRow}
              onPress={() => setSegnaInviato(v => !v)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, segnaInviato && styles.checkboxChecked]}>
                {segnaInviato && <Text style={styles.checkboxTick}>✓</Text>}
              </View>
              <Text style={styles.inviataLabel}>Segna come inviato</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.titoloSaveBtn}
              onPress={async () => {
                setMostraModalTitolo(false)
                await aggiornaTitolo(titolo)
                if (segnaInviato && preventivoSalvatoId) {
                  await supabase.from('preventivi').update({ stato: 'inviato' }).eq('id', preventivoSalvatoId)
                  eventBus.emit('aggiorna-home')
                }
                setSegnaInviato(false)
              }}
            >
              <Text style={styles.titoloSaveBtnText}>Salva</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.titoloSkipBtn}
              onPress={async () => {
                setMostraModalTitolo(false)
                if (segnaInviato && preventivoSalvatoId) {
                  await supabase.from('preventivi').update({ stato: 'inviato' }).eq('id', preventivoSalvatoId)
                  eventBus.emit('aggiorna-home')
                }
                setSegnaInviato(false)
              }}
            >
              <Text style={styles.titoloSkipText}>Va bene così</Text>
            </TouchableOpacity>
          </View>
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
  scroll: { flex: 1 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#0D1B2A' },
  cardSub: { fontSize: 12, color: '#9CA3AF', marginBottom: 8 },
  previewContainer: { height: 420, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff' },
  webview: { flex: 1 },
  previewPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  previewPlaceholderText: { fontSize: 13, color: '#9CA3AF' },
  templateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  templateCard: { width: '30%', backgroundColor: '#F7F8FA', borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB' },
  templateCardActive: { backgroundColor: '#E1F5EE', borderColor: '#0E9F8E' },
  templateEmoji: { fontSize: 24, marginBottom: 4 },
  templateNome: { fontSize: 12, fontWeight: '600', color: '#0D1B2A', textAlign: 'center' },
  templateNomeActive: { color: '#0E9F8E' },
  templateDesc: { fontSize: 10, color: '#9CA3AF', textAlign: 'center', marginTop: 2 },
  toggleRow: { backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  toggleLabel: { fontSize: 14, fontWeight: '500', color: '#0D1B2A' },
  toggleSub: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  clienteBtn: { backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  clienteBtnIcon: { fontSize: 20 },
  clienteBtnBody: { flex: 1 },
  clienteBtnLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  clienteBtnVal: { fontSize: 14, color: '#0D1B2A', marginTop: 2 },
  clienteBtnArrow: { fontSize: 20, color: '#9CA3AF' },
  versionBox: { backgroundColor: '#EBF3FF', borderRadius: 12, padding: 12 },
  versionText: { fontSize: 13, color: '#1E40ED', lineHeight: 18 },
  generateBtn: { backgroundColor: '#0D1B2A', borderRadius: 14, padding: 16, alignItems: 'center' as const },
  generateBtnDisabled: { opacity: 0.5 },
  generateBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  toast: { position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: '#065F46', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, elevation: 6 },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  modalContainer: { flex: 1, backgroundColor: '#F7F8FA' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56, backgroundColor: '#0D1B2A' },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalClose: { color: '#9CA3AF', fontSize: 20 },
  modalTabs: { flexDirection: 'row', backgroundColor: '#fff', margin: 16, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: '#E5E7EB' },
  modalTab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' as const },
  modalTabActive: { backgroundColor: '#0D1B2A' },
  modalTabText: { fontSize: 13, fontWeight: '500', color: '#9CA3AF' },
  modalTabTextActive: { color: '#fff' },
  modalEmpty: { alignItems: 'center', paddingTop: 40 },
  modalEmptyText: { fontSize: 14, color: '#9CA3AF' },
  modalEmptyLink: { fontSize: 14, color: '#0E9F8E', marginTop: 8, fontWeight: '600' },
  clienteItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  clienteItemActive: { borderColor: '#0E9F8E', backgroundColor: '#F0FDF4' },
  clienteItemAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#0D1B2A', justifyContent: 'center', alignItems: 'center' },
  clienteItemAvatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  clienteItemNome: { flex: 1, fontSize: 14, fontWeight: '500', color: '#0D1B2A' },
  clienteItemCheck: { fontSize: 16, color: '#0E9F8E', fontWeight: '700' },
  modalNewForm: { padding: 16, gap: 12 },
  modalNewLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.8 },
  modalNewInput: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 12, fontSize: 14, color: '#0D1B2A' },
  modalNewBtn: { backgroundColor: '#0D1B2A', borderRadius: 12, padding: 14, alignItems: 'center' as const },
  modalNewBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  modalSkipBtn: { padding: 12, alignItems: 'center' as const },
  modalSkipText: { fontSize: 13, color: '#9CA3AF' },
  titoloOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' as const, alignItems: 'center' as const, padding: 24 },
  titoloBox: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', gap: 12 },
  titoloTitle: { fontSize: 17, fontWeight: '600' as const, color: '#0D1B2A', textAlign: 'center' as const },
  titoloSub: { fontSize: 12, color: '#9CA3AF', textAlign: 'center' as const },
  titoloInput: { backgroundColor: '#F7F8FA', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 12, fontSize: 14, color: '#0D1B2A' },
  titoloSaveBtn: { backgroundColor: '#0D1B2A', borderRadius: 12, padding: 14, alignItems: 'center' as const },
  titoloSaveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' as const },
  titoloSkipBtn: { padding: 10, alignItems: 'center' as const },
  titoloSkipText: { fontSize: 13, color: '#9CA3AF' },
  pagamentoInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F8FA', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E5E7EB', gap: 12 },
  abLabel: { fontSize: 11, fontWeight: '600' as const, color: '#9CA3AF', letterSpacing: 0.8, marginBottom: 4 },
  abInput: { backgroundColor: '#F7F8FA', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 12, fontSize: 14, color: '#0D1B2A' },
  inviataRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  inviataLabel: { fontSize: 14, color: '#0D1B2A', fontWeight: '500' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: '#0E9F8E', borderColor: '#0E9F8E' },
  checkboxTick: { color: '#fff', fontSize: 13, fontWeight: '700' },
})
