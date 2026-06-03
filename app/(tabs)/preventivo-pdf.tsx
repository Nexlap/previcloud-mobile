import Constants from 'expo-constants'
import * as Print from 'expo-print'
import { router, useLocalSearchParams } from 'expo-router'
import * as Sharing from 'expo-sharing'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator, Alert, FlatList, Modal, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View
} from 'react-native'
import { supabase } from '../../lib/supabase'

const TEMPLATES = [
  { id: 'pulito', nome: 'Pulito', desc: 'Moderno e professionale', emoji: '⬜' },
  { id: 'classico', nome: 'Classico', desc: 'Formale con bordi', emoji: '📋' },
  { id: 'bold', nome: 'Bold', desc: 'Intestazione colorata', emoji: '🎨' },
  { id: 'minimal_dark', nome: 'Dark', desc: 'Sfondo scuro elegante', emoji: '🌙' },
  { id: 'artigiano', nome: 'Artigiano', desc: 'Caldo e personale', emoji: '🪵' },
]

export default function PreventivoPDF() {
  const { testo: testoParam, preventivo_id, versione_padre_id, cliente_id } = useLocalSearchParams<{
    testo: string
    preventivo_id: string
    versione_padre_id: string
    cliente_id: string
  }>()

  const [testo, setTesto] = useState(testoParam || '')
  const [template, setTemplate] = useState('pulito')
  const [generando, setGenerando] = useState(false)
  const [token, setToken] = useState('')
  const [versione, setVersione] = useState(1)
  const [modificato, setModificato] = useState(false)
  const [clienti, setClienti] = useState<{ id: string, nome: string }[]>([])
  const [clienteSelezionato, setClienteSelezionato] = useState<{ id: string, nome: string } | null>(null)
  const [mostraModalCliente, setMostraModalCliente] = useState(false)
  const [nuovoNomeCliente, setNuovoNomeCliente] = useState('')
  const [modalTab, setModalTab] = useState<'esistente' | 'nuovo'>('esistente')
  const [titolo, setTitolo] = useState('')
  const [mostraModalTitolo, setMostraModalTitolo] = useState(false)
  const [htmlGenerato, setHtmlGenerato] = useState('')
  const [versioneGenerata, setVersioneGenerata] = useState(1)
  const backendUrl = Constants.expoConfig?.extra?.backendUrl

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/(auth)/login'); return }
      setToken(session.access_token)
    })
    caricaTemplatePref()
    caricaClienti()
  }, [])

  useEffect(() => {
    if (cliente_id) {
      supabase.from('clienti').select('id, nome').eq('id', cliente_id).single()
        .then(({ data }) => { if (data) setClienteSelezionato(data) })
    }
  }, [cliente_id])

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
      const res = await fetch(`${backendUrl}/api/genera-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ testo, template, versione_padre_id: versione_padre_id || null })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setVersioneGenerata(data.versione)
      setHtmlGenerato(data.html)

      const { uri } = await Print.printToFileAsync({ html: data.html, base64: false })
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Invia preventivo',
          UTI: 'com.adobe.pdf'
        })
      }

      const nomeCliente = clienteSelezionato?.nome || 'Cliente'
      setTitolo(`Preventivo ${nomeCliente}`)
      setMostraModalTitolo(true)

    } catch (err: any) {
      Alert.alert('Errore', err.message)
    }
    setGenerando(false)
  }

  async function salvaSuSupabase(ver: number, titoloScelto: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('preventivi').insert({
      user_id: user.id,
      testo_preventivo: testo,
      template,
      versione: ver,
      preventivo_padre_id: versione_padre_id || null,
      is_ultimo: true,
      stato: 'bozza',
      cliente_id: clienteSelezionato?.id || null,
      nome_cliente: clienteSelezionato?.nome || null,
      titolo: titoloScelto
    })
  }

  async function salvaTemplate(tmpl: string) {
    setTemplate(tmpl)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({ template_preferito: tmpl }).eq('id', user.id)
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Preventivo {versione_padre_id ? `v${versione}` : ''}
        </Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16, gap: 14 }}>

        {/* Editor testo */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Testo preventivo</Text>
            {modificato && <Text style={styles.modificatoBadge}>● Modificato</Text>}
          </View>
          <Text style={styles.cardSub}>Modifica il testo prima di generare il PDF</Text>
          <TextInput
            style={styles.editor}
            value={testo}
            onChangeText={t => { setTesto(t); setModificato(true) }}
            multiline
            textAlignVertical="top"
            placeholder="Il testo del preventivo apparirà qui..."
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Scelta template */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Scegli template</Text>
          <Text style={styles.cardSub}>Il template preferito viene salvato automaticamente</Text>
          <View style={styles.templateGrid}>
            {TEMPLATES.map(t => (
              <TouchableOpacity
                key={t.id}
                style={[styles.templateCard, template === t.id && styles.templateCardActive]}
                onPress={() => salvaTemplate(t.id)}
              >
                <Text style={styles.templateEmoji}>{t.emoji}</Text>
                <Text style={[styles.templateNome, template === t.id && styles.templateNomeActive]}>
                  {t.nome}
                </Text>
                <Text style={styles.templateDesc}>{t.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Associa cliente */}
        <TouchableOpacity style={styles.clienteBtn} onPress={() => setMostraModalCliente(true)}>
          <Text style={styles.clienteBtnIcon}>👤</Text>
          <View style={styles.clienteBtnBody}>
            <Text style={styles.clienteBtnLabel}>Cliente</Text>
            <Text style={styles.clienteBtnVal}>
              {clienteSelezionato ? clienteSelezionato.nome : 'Nessuno — tocca per associare'}
            </Text>
          </View>
          <Text style={styles.clienteBtnArrow}>›</Text>
        </TouchableOpacity>

        {/* Versioning info */}
        {versione_padre_id && (
          <View style={styles.versionBox}>
            <Text style={styles.versionText}>
              📋 Stai creando una nuova versione. La precedente rimane nello storico.
            </Text>
          </View>
        )}

        {/* Bottone genera */}
        <TouchableOpacity
          style={[styles.generateBtn, (generando || !testo.trim()) && styles.generateBtnDisabled]}
          onPress={generaPDF}
          disabled={generando || !testo.trim()}
        >
          {generando
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.generateBtnText}>📄 Genera PDF e condividi</Text>
          }
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal selezione cliente */}
      <Modal visible={mostraModalCliente} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>A chi è questo preventivo?</Text>
            <TouchableOpacity onPress={() => setMostraModalCliente(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalTabs}>
            <TouchableOpacity
              style={[styles.modalTab, modalTab === 'esistente' && styles.modalTabActive]}
              onPress={() => setModalTab('esistente')}>
              <Text style={[styles.modalTabText, modalTab === 'esistente' && styles.modalTabTextActive]}>
                Cliente esistente
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalTab, modalTab === 'nuovo' && styles.modalTabActive]}
              onPress={() => setModalTab('nuovo')}>
              <Text style={[styles.modalTabText, modalTab === 'nuovo' && styles.modalTabTextActive]}>
                Nuovo cliente
              </Text>
            </TouchableOpacity>
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
                    <Text style={styles.modalEmptyLink}>Aggiungi il primo →</Text>
                  </TouchableOpacity>
                </View>
              }
              renderItem={({ item }: { item: { id: string, nome: string } }) => (
                <TouchableOpacity
                  style={[styles.clienteItem, clienteSelezionato?.id === item.id && styles.clienteItemActive]}
                  onPress={() => { setClienteSelezionato(item); setMostraModalCliente(false) }}
                >
                  <View style={styles.clienteItemAvatar}>
                    <Text style={styles.clienteItemAvatarText}>{item.nome.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.clienteItemNome}>{item.nome}</Text>
                  {clienteSelezionato?.id === item.id && <Text style={styles.clienteItemCheck}>✓</Text>}
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
              <TouchableOpacity
                style={styles.modalSkipBtn}
                onPress={() => { setClienteSelezionato(null); setMostraModalCliente(false) }}
              >
                <Text style={styles.modalSkipText}>Salta — senza cliente</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* Modal titolo preventivo */}
      <Modal visible={mostraModalTitolo} transparent animationType="fade">
        <View style={styles.titoloOverlay}>
          <View style={styles.titoloBox}>
            <Text style={styles.titoloTitle}>Come vuoi chiamarlo?</Text>
            <Text style={styles.titoloSub}>Puoi modificare il nome in qualsiasi momento</Text>
            <TextInput
              style={styles.titoloInput}
              value={titolo}
              onChangeText={setTitolo}
              placeholder="es. Preventivo caldaia"
              placeholderTextColor="#9CA3AF"
              autoFocus
            />
            <TouchableOpacity
              style={styles.titoloSaveBtn}
              onPress={async () => {
                setMostraModalTitolo(false)
                await salvaSuSupabase(versioneGenerata, titolo)
                Alert.alert('✓ Salvato', `"${titolo}" salvato nello storico.`)
              }}
            >
              <Text style={styles.titoloSaveBtnText}>Salva</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.titoloSkipBtn}
              onPress={() => setMostraModalTitolo(false)}
            >
              <Text style={styles.titoloSkipText}>Salta — non salvare</Text>
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#0D1B2A' },
  cardSub: { fontSize: 12, color: '#9CA3AF', marginBottom: 12 },
  modificatoBadge: { fontSize: 11, color: '#0E9F8E', fontWeight: '600' },
  editor: { backgroundColor: '#F7F8FA', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 12, fontSize: 13, color: '#0D1B2A', minHeight: 200, lineHeight: 20 },
  templateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  templateCard: { width: '30%', backgroundColor: '#F7F8FA', borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB' },
  templateCardActive: { backgroundColor: '#E1F5EE', borderColor: '#0E9F8E' },
  templateEmoji: { fontSize: 24, marginBottom: 4 },
  templateNome: { fontSize: 12, fontWeight: '600', color: '#0D1B2A', textAlign: 'center' },
  templateNomeActive: { color: '#0E9F8E' },
  templateDesc: { fontSize: 10, color: '#9CA3AF', textAlign: 'center', marginTop: 2 },
  clienteBtn: { backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  clienteBtnIcon: { fontSize: 20 },
  clienteBtnBody: { flex: 1 },
  clienteBtnLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  clienteBtnVal: { fontSize: 14, color: '#0D1B2A', marginTop: 2 },
  clienteBtnArrow: { fontSize: 20, color: '#9CA3AF' },
  versionBox: { backgroundColor: '#EBF3FF', borderRadius: 12, padding: 12 },
  versionText: { fontSize: 13, color: '#1E40AF', lineHeight: 18 },
  generateBtn: { backgroundColor: '#0D1B2A', borderRadius: 14, padding: 16, alignItems: 'center' },
  generateBtnDisabled: { opacity: 0.5 },
  generateBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
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
})