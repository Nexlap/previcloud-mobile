import Constants from 'expo-constants'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform,
  ScrollView,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View
} from 'react-native'
import { supabase } from '../../lib/supabase'

export default function Settings() {
  const [form, setForm] = useState({
    nome_azienda: '',
    categoria: 'idraulico',
    citta: '',
    piva: '',
    telefono: '',
    listino: '',
    tono: 'professionale e diretto',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [logoUrl, setLogoUrl] = useState('')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [token, setToken] = useState('')
  const backendUrl = Constants.expoConfig?.extra?.backendUrl

  useEffect(() => {
  carica()
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) setToken(session.access_token)
  })
}, [])

  async function carica() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/(auth)/login'); return }
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) setForm({
      nome_azienda: data.nome_azienda || '',
      categoria: data.categoria || 'idraulico',
      citta: data.citta || '',
      piva: data.piva || '',
      telefono: data.telefono || '',
      listino: data.listino || '',
      tono: data.tono || 'professionale e diretto',
    })
    if (data?.logo_url) setLogoUrl(data.logo_url)

    setLoading(false)
  }

  async function salva() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('profiles').update(form).eq('id', user.id)
    setSaving(false)
    if (error) Alert.alert('Errore', error.message)
    else Alert.alert('Salvato!', 'Profilo aggiornato.')
  }

  function set(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function addVoce(v: string) {
    setForm(f => ({ ...f, listino: f.listino ? f.listino + '\n' + v : v }))
  }

  async function scegliLogo() {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (status !== 'granted') {
    Alert.alert('Permesso negato', 'Serve accesso alla galleria per caricare il logo.')
    return
  }

  const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsEditing: true,
  aspect: [4, 1],
  quality: 0.3,
  base64: true,
  exif: false,
})

  if (result.canceled || !result.assets[0]) return

  setUploadingLogo(true)
  try {
    const asset = result.assets[0]
if (!asset.base64) throw new Error('Impossibile leggere l\'immagine')

const sizeKB = (asset.base64.length * 0.75) / 1024
if (sizeKB > 500) {
  Alert.alert('Immagine troppo grande', 'Scegli un\'immagine più piccola (max 500KB)')
  setUploadingLogo(false)
  return
}
    const res = await fetch(`${backendUrl}/api/upload-logo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        logo_base64: asset.base64,
        mime_type: asset.mimeType || 'image/jpeg'
      })
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    setLogoUrl(data.logo_url)
    Alert.alert('✓ Logo caricato', 'Il logo apparirà su tutti i tuoi preventivi PDF.')
  } catch (err: any) {
    Alert.alert('Errore', err.message)
  }
  setUploadingLogo(false)
}
  
  const categorie = ['idraulico', 'elettricista', 'falegname', 'estetista', 'imbianchino', 'fotografo', 'altro']
  const toni = ['professionale e diretto', 'cordiale e disponibile', 'formale e preciso', 'semplice e informale']

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#0E9F8E" />
    </View>
  )

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Impostazioni</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16, gap: 14 }}>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dati azienda</Text>
          <Text style={styles.label}>NOME / AZIENDA</Text>
          <TextInput style={styles.input} value={form.nome_azienda} onChangeText={v => set('nome_azienda', v)} placeholder="es. Rossi Impianti" placeholderTextColor="#9CA3AF" />
          <Text style={styles.label}>CITTÀ</Text>
          <TextInput style={styles.input} value={form.citta} onChangeText={v => set('citta', v)} placeholder="es. Roma" placeholderTextColor="#9CA3AF" />
          <Text style={styles.label}>P.IVA</Text>
          <TextInput style={styles.input} value={form.piva} onChangeText={v => set('piva', v)} placeholder="es. 12345678901" placeholderTextColor="#9CA3AF" keyboardType="numeric" />
          <Text style={styles.label}>TELEFONO</Text>
          <TextInput style={styles.input} value={form.telefono} onChangeText={v => set('telefono', v)} placeholder="es. 339 1234567" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Categoria</Text>
          <View style={styles.chips}>
            {categorie.map(c => (
              <TouchableOpacity key={c} style={[styles.chip, form.categoria === c && styles.chipActive]} onPress={() => set('categoria', c)}>
                <Text style={[styles.chipText, form.categoria === c && styles.chipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Listino prezzi</Text>
          <Text style={styles.cardSub}>L'AI userà questi prezzi per ogni preventivo</Text>
          <View style={styles.tags}>
            {['Rubinetto: €80', 'Perdita: €60-120', 'WC: €70', 'Scarico: €55', 'Caldaia: €90', 'Urgenza: +50%'].map(v => (
              <TouchableOpacity key={v} style={styles.tag} onPress={() => addVoce(v)}>
                <Text style={styles.tagText}>+ {v}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={[styles.input, { height: 140, textAlignVertical: 'top' }]}
            value={form.listino} onChangeText={v => set('listino', v)}
            placeholder={'es. Rubinetto: €80\nPerdita: €60-120\nUrgenza: +50%'}
            placeholderTextColor="#9CA3AF" multiline />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tono di comunicazione</Text>
          <View style={styles.chips}>
            {toni.map(t => (
              <TouchableOpacity key={t} style={[styles.chip, form.tono === t && styles.chipActive]} onPress={() => set('tono', t)}>
                <Text style={[styles.chipText, form.tono === t && styles.chipTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
            
            <View style={styles.card}>
  <Text style={styles.cardTitle}>Logo aziendale</Text>
  <Text style={styles.cardSub}>Appare nell'intestazione di tutti i preventivi PDF</Text>
  {logoUrl ? (
    <Image source={{ uri: logoUrl }} style={styles.logoPreview} resizeMode="contain" />
  ) : (
    <View style={styles.logoPlaceholder}>
      <Text style={styles.logoPlaceholderText}>Nessun logo caricato</Text>
    </View>
  )}
  <TouchableOpacity
    style={[styles.logoBtn, uploadingLogo && styles.saveBtnDisabled]}
    onPress={scegliLogo}
    disabled={uploadingLogo}
  >
    {uploadingLogo
      ? <ActivityIndicator color="#fff" size="small" />
      : <Text style={styles.logoBtnText}>
          {logoUrl ? '🔄 Cambia logo' : '📷 Carica logo'}
        </Text>
    }
  </TouchableOpacity>
</View>
        <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={salva} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Salva impostazioni</Text>}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F8FA' },
  header: { backgroundColor: '#0D1B2A', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { padding: 4, width: 50 },
  backText: { color: '#9CA3AF', fontSize: 22 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  scroll: { flex: 1 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#0D1B2A', marginBottom: 4 },
  cardSub: { fontSize: 12, color: '#9CA3AF', marginBottom: 12 },
  label: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.8, marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: '#F7F8FA', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 12, fontSize: 14, color: '#0D1B2A' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#E5E7EB' },
  chipActive: { backgroundColor: '#0D1B2A', borderColor: '#0D1B2A' },
  chipText: { fontSize: 13, color: '#6B7280' },
  chipTextActive: { color: '#fff', fontWeight: '500' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: '#F7F8FA', borderWidth: 1, borderColor: '#E5E7EB' },
  tagText: { fontSize: 11, color: '#6B7280' },
  saveBtn: { backgroundColor: '#0D1B2A', borderRadius: 14, padding: 16, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  logoPreview: { width: '100%', height: 80, backgroundColor: '#F7F8FA', borderRadius: 10, marginBottom: 10 },
logoPlaceholder: { width: '100%', height: 80, backgroundColor: '#F7F8FA', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed' as const },
logoPlaceholderText: { fontSize: 13, color: '#9CA3AF' },
logoBtn: { backgroundColor: '#0D1B2A', borderRadius: 12, padding: 12, alignItems: 'center' as const },
logoBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' as const },
})