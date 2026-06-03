import Constants from 'expo-constants'
import * as Print from 'expo-print'
import { router, useLocalSearchParams } from 'expo-router'
import * as Sharing from 'expo-sharing'
import { useEffect, useState } from 'react'
import {
    ActivityIndicator, Alert,
    ScrollView,
    StyleSheet,
    Text, TextInput, TouchableOpacity,
    View
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
  const { testo: testoParam, preventivo_id, versione_padre_id } = useLocalSearchParams<{
    testo: string
    preventivo_id: string
    versione_padre_id: string
  }>()

  const [testo, setTesto] = useState(testoParam || '')
  const [template, setTemplate] = useState('pulito')
  const [loading, setLoading] = useState(false)
  const [generando, setGenerando] = useState(false)
  const [token, setToken] = useState('')
  const [versione, setVersione] = useState(1)
  const [modificato, setModificato] = useState(false)
  const backendUrl = Constants.expoConfig?.extra?.backendUrl

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/(auth)/login'); return }
      setToken(session.access_token)
    })
    caricaTemplatePref()
  }, [])

  async function caricaTemplatePref() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('template_preferito').eq('id', user.id).single()
    if (data?.template_preferito) setTemplate(data.template_preferito)
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

      setVersione(data.versione)

      const { uri } = await Print.printToFileAsync({ html: data.html, base64: false })

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Invia preventivo',
          UTI: 'com.adobe.pdf'
        })
      }

      // Salva versione in Supabase
      await salvaSuSupabase(data.versione)

    } catch (err: any) {
      Alert.alert('Errore', err.message)
    }
    setGenerando(false)
  }

  async function salvaSuSupabase(ver: number) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('preventivi').insert({
      user_id: user.id,
      testo_preventivo: testo,
      template,
      versione: ver,
      preventivo_padre_id: versione_padre_id || null,
      is_ultimo: true,
      stato: 'bozza'
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

        {/* Versioning info */}
        {versione_padre_id && (
          <View style={styles.versionBox}>
            <Text style={styles.versionText}>
              📋 Stai creando una nuova versione del preventivo. La versione precedente rimane nello storico.
            </Text>
          </View>
        )}

        {/* Bottone genera */}
        <TouchableOpacity
          style={[styles.generateBtn, generando && styles.generateBtnDisabled]}
          onPress={generaPDF}
          disabled={generando || !testo.trim()}
        >
          {generando
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.generateBtnText}>
                📄 Genera PDF e condividi
              </Text>
          }
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
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
  versionBox: { backgroundColor: '#EBF3FF', borderRadius: 12, padding: 12 },
  versionText: { fontSize: 13, color: '#1E40AF', lineHeight: 18 },
  generateBtn: { backgroundColor: '#0D1B2A', borderRadius: 14, padding: 16, alignItems: 'center' },
  generateBtnDisabled: { opacity: 0.5 },
  generateBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
})