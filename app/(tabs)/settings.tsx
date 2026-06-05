import Constants from 'expo-constants'
import * as ImagePicker from 'expo-image-picker'
import { router, useNavigation } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native'
import { supabase } from '../../lib/supabase'

interface Servizio {
  id: string
  nome: string
  descrizione: string
  costo: string
  unita: string
}

export default function Settings() {
  const [form, setForm] = useState({
    nome_azienda: '',
    categoria: 'videomaker',
    citta: '',
    piva: '',
    telefono: '',
    tono: 'professionale e diretto',
    colore_brand: '0D1B2A',
    note_pagamento: '',
    firma_nome: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [logoUrl, setLogoUrl] = useState('')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [token, setToken] = useState('')
  const [servizi, setServizi] = useState<Servizio[]>([])
  const [mostraModalServizio, setMostraModalServizio] = useState(false)
  const [servizioInEdit, setServizioInEdit] = useState<Servizio | null>(null)
  const [nuovoServizio, setNuovoServizio] = useState({ nome: '', descrizione: '', costo: '', unita: 'cad' })
  const [salvandoServizio, setSalvandoServizio] = useState(false)
  const [modificheNonSalvate, setModificheNonSalvate] = useState(false)
  const formIniziale = useRef<typeof form | null>(null)
  const formRef = useRef(form)
  useEffect(() => { formRef.current = form }, [form])
  const navigation = useNavigation()
  const backendUrl = Constants.expoConfig?.extra?.backendUrl

  const unitaOptions = ['cad', 'ora', 'giorno', 'mq', 'ml', 'set', 'progetto']
  const categorie = ['videomaker', 'fotografo', 'catering', 'falegname', 'estetista', 'elettricista', 'idraulico', 'imbianchino', 'altro']
  const toni = ['professionale e diretto', 'cordiale e disponibile', 'formale e preciso', 'semplice e informale']

  useEffect(() => {
    carica()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setToken(session.access_token)
    })
  }, [])

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (!modificheNonSalvate) return
      e.preventDefault()
      Alert.alert('Modifiche non salvate', 'Vuoi salvare le modifiche al profilo?', [
        { text: 'Abbandona', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
        { text: 'Continua', style: 'cancel' },
        { text: 'Salva', onPress: async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) await supabase.from('profiles').update(formRef.current).eq('id', user.id)
  navigation.dispatch(e.data.action)
}}
      ])
    })
    return unsubscribe
  }, [modificheNonSalvate, navigation])

  async function carica() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/(auth)/login'); return }

    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) {
      const nuovoForm = {
        nome_azienda: data.nome_azienda || '',
        categoria: data.categoria || 'videomaker',
        citta: data.citta || '',
        piva: data.piva || '',
        telefono: data.telefono || '',
        tono: data.tono || 'professionale e diretto',
        colore_brand: data.colore_brand || '0D1B2A',
        note_pagamento: data.note_pagamento || '',
        firma_nome: data.firma_nome || '',
      }
      setForm(nuovoForm)
      formIniziale.current = nuovoForm
      if (data.logo_url) setLogoUrl(data.logo_url)
    }

    const { data: serviziData } = await supabase
      .from('servizi')
      .select('*')
      .eq('user_id', user.id)
      .order('ordine', { ascending: true })

    if (serviziData) setServizi(serviziData.map(s => ({
      ...s,
      costo: s.costo?.toString() || '',
      descrizione: s.descrizione || '',
    })))

    setLoading(false)
  }

  async function salva() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('profiles').update(form).eq('id', user.id)
    setSaving(false)
    if (error) Alert.alert('Errore', error.message)
    else { Alert.alert('✓ Salvato', 'Profilo aggiornato.'); setModificheNonSalvate(false); if (formIniziale.current) formIniziale.current = form }
  }

  function set(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }))
    setModificheNonSalvate(true)
  }

  function apriNuovoServizio() {
    setServizioInEdit(null)
    setNuovoServizio({ nome: '', descrizione: '', costo: '', unita: 'cad' })
    setMostraModalServizio(true)
  }

  function apriModificaServizio(s: Servizio) {
    setServizioInEdit(s)
    setNuovoServizio({ nome: s.nome, descrizione: s.descrizione, costo: s.costo, unita: s.unita })
    setMostraModalServizio(true)
  }

  async function salvaServizio() {
    if (!nuovoServizio.nome.trim()) {
      Alert.alert('Errore', 'Inserisci almeno il nome del servizio')
      return
    }
    setSalvandoServizio(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      nome: nuovoServizio.nome.trim(),
      descrizione: nuovoServizio.descrizione.trim() || null,
      costo: nuovoServizio.costo ? parseFloat(nuovoServizio.costo) : null,
      unita: nuovoServizio.unita,
      user_id: user.id,
      ordine: servizi.length,
    }

    if (servizioInEdit) {
      const { error } = await supabase.from('servizi').update(payload).eq('id', servizioInEdit.id)
      if (!error) {
        setServizi(s => s.map(x => x.id === servizioInEdit.id ? { ...x, ...nuovoServizio } : x))
      }
    } else {
      const { data, error } = await supabase.from('servizi').insert(payload).select().single()
      if (!error && data) {
        setServizi(s => [...s, { ...data, costo: data.costo?.toString() || '', descrizione: data.descrizione || '' }])
      }
    }

    setSalvandoServizio(false)
    setMostraModalServizio(false)
  }

  async function eliminaServizio(id: string) {
    Alert.alert('Elimina servizio', 'Vuoi eliminare questo servizio?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: async () => {
        await supabase.from('servizi').delete().eq('id', id)
        setServizi(s => s.filter(x => x.id !== id))
      }}
    ])
  }

  async function scegliLogo() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') { Alert.alert('Permesso negato', 'Serve accesso alla galleria.'); return }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [4, 1], quality: 0.3, base64: true, exif: false,
    })
    if (result.canceled || !result.assets[0]) return

    setUploadingLogo(true)
    try {
      const asset = result.assets[0]
      if (!asset.base64) throw new Error('Impossibile leggere l\'immagine')
      const sizeKB = (asset.base64.length * 0.75) / 1024
      if (sizeKB > 500) { Alert.alert('Immagine troppo grande', 'Max 500KB'); setUploadingLogo(false); return }

      const res = await fetch(`${backendUrl}/api/upload-logo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ logo_base64: asset.base64, mime_type: asset.mimeType || 'image/jpeg' })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setLogoUrl(data.logo_url)
      Alert.alert('✓ Logo caricato', 'Apparirà su tutti i tuoi preventivi PDF.')
    } catch (err: any) {
      Alert.alert('Errore', err.message)
    }
    setUploadingLogo(false)
  }

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#0E9F8E" />
    </View>
  )

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Impostazioni</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16, gap: 14 }}>

        {/* Dati azienda */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dati azienda</Text>
          <Text style={styles.label}>NOME / AZIENDA</Text>
          <TextInput style={styles.input} value={form.nome_azienda} onChangeText={v => set('nome_azienda', v)} placeholder="es. Galmazzi Videomaker" placeholderTextColor="#9CA3AF" />
          <Text style={styles.label}>CITTÀ</Text>
          <TextInput style={styles.input} value={form.citta} onChangeText={v => set('citta', v)} placeholder="es. Roma" placeholderTextColor="#9CA3AF" />
          <Text style={styles.label}>P.IVA</Text>
          <TextInput style={styles.input} value={form.piva} onChangeText={v => set('piva', v)} placeholder="es. 12345678901" placeholderTextColor="#9CA3AF" keyboardType="numeric" />
          <Text style={styles.label}>TELEFONO</Text>
          <TextInput style={styles.input} value={form.telefono} onChangeText={v => set('telefono', v)} placeholder="es. 339 1234567" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" />
        </View>

        {/* Categoria */}
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

        {/* Servizi */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.cardTitle}>I miei servizi</Text>
              <Text style={styles.cardSub}>L'AI usa questi servizi per generare i preventivi</Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={apriNuovoServizio}>
              <Text style={styles.addBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          {servizi.length === 0 ? (
            <TouchableOpacity style={styles.emptyServizi} onPress={apriNuovoServizio}>
              <Text style={styles.emptyServiziIcon}>📋</Text>
              <Text style={styles.emptyServiziText}>Nessun servizio ancora</Text>
              <Text style={styles.emptyServiziSub}>Tocca + per aggiungere il primo</Text>
            </TouchableOpacity>
          ) : (
            servizi.map(s => (
              <View key={s.id} style={styles.servizioRow}>
                <View style={styles.servizioLeft}>
                  <Text style={styles.servizioNome}>{s.nome}</Text>
                  {s.descrizione ? <Text style={styles.servizioDesc}>{s.descrizione}</Text> : null}
                </View>
                <View style={styles.servizioRight}>
                  {s.costo ? (
                    <Text style={styles.servizioCosto}>€{s.costo}/{s.unita}</Text>
                  ) : null}
                  <View style={styles.servizioActions}>
                    <TouchableOpacity onPress={() => apriModificaServizio(s)} style={styles.servizioActionBtn}>
                      <Text style={styles.servizioActionText}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => eliminaServizio(s.id)} style={styles.servizioActionBtn}>
                      <Text style={styles.servizioActionText}>🗑</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Tono */}
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

        {/* Logo */}
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
          <TouchableOpacity style={[styles.logoBtn, uploadingLogo && styles.saveBtnDisabled]} onPress={scegliLogo} disabled={uploadingLogo}>
            {uploadingLogo
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.logoBtnText}>{logoUrl ? '🔄 Cambia logo' : '📷 Carica logo'}</Text>
            }
          </TouchableOpacity>
        </View>
        {/* Colore brand */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🎨 Colore brand</Text>
          <Text style={styles.cardSub}>Usato nell'intestazione e nei dettagli del PDF</Text>
          <View style={styles.coloriGrid}>
            {['0D1B2A','0E9F8E','1D4ED8','7C3AED','DC2626','EA580C','059669','374151'].map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.coloreChip, { backgroundColor: '#' + c }, form.colore_brand === c && styles.coloreChipActive]}
                onPress={() => set('colore_brand', c)}
              >
                {form.colore_brand === c && <Text style={styles.coloreChipCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>CODICE HEX PERSONALIZZATO</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={form.colore_brand}
              onChangeText={v => set('colore_brand', v.replace('#', '').toUpperCase())}
              placeholder="es. 0D1B2A"
              placeholderTextColor="#9CA3AF"
              maxLength={6}
              autoCapitalize="characters"
            />
            <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: '#' + (form.colore_brand || '0D1B2A') }} />
          </View>
        </View>

        {/* Note pagamento */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💳 Note pagamento</Text>
          <Text style={styles.cardSub}>Appare in fondo a tutti i preventivi PDF</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' as const }]}
            value={form.note_pagamento}
            onChangeText={v => set('note_pagamento', v)}
            placeholder="es. Pagamento 50% anticipato, saldo alla consegna"
            placeholderTextColor="#9CA3AF"
            multiline
          />
        </View>

        {/* Firma corsivo */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>✍️ Firma</Text>
          <Text style={styles.cardSub}>Nome in corsivo elegante in fondo al PDF</Text>
          <TextInput
            style={styles.input}
            value={form.firma_nome}
            onChangeText={v => set('firma_nome', v)}
            placeholder="es. Mario Rossi"
            placeholderTextColor="#9CA3AF"
          />
          {form.firma_nome ? (
            <Text style={styles.firmaPreview}>{form.firma_nome}</Text>
          ) : null}
        </View>

        <TouchableOpacity
  style={styles.fiscaleBtn}
  onPress={() => router.push('/(tabs)/fiscale')}
>
  <Text style={styles.fiscaleBtnText}>🧾 Regime fiscale e tasse</Text>
  <Text style={styles.fiscaleBtnArrow}>›</Text>
</TouchableOpacity>

        <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={salva} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Salva impostazioni</Text>}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal aggiungi/modifica servizio */}
      <Modal visible={mostraModalServizio} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setMostraModalServizio(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{servizioInEdit ? 'Modifica servizio' : 'Nuovo servizio'}</Text>
            <TouchableOpacity onPress={salvaServizio} disabled={salvandoServizio}>
              {salvandoServizio
                ? <ActivityIndicator color={styles.modalSave.color} size="small" />
                : <Text style={styles.modalSave}>Salva</Text>
              }
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>NOME SERVIZIO *</Text>
              <TextInput
                style={styles.fieldInput}
                value={nuovoServizio.nome}
                onChangeText={v => setNuovoServizio(s => ({ ...s, nome: v }))}
                placeholder="es. Editing video, Riprese giornata, Color grading"
                placeholderTextColor="#9CA3AF"
                autoFocus
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>DESCRIZIONE</Text>
              <TextInput
                style={[styles.fieldInput, { height: 80, textAlignVertical: 'top' }]}
                value={nuovoServizio.descrizione}
                onChangeText={v => setNuovoServizio(s => ({ ...s, descrizione: v }))}
                placeholder="es. Montaggio video con musica e sottotitoli, max 10 min"
                placeholderTextColor="#9CA3AF"
                multiline
              />
            </View>

            <View style={styles.costoRow}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>COSTO (€)</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={nuovoServizio.costo}
                  onChangeText={v => setNuovoServizio(s => ({ ...s, costo: v }))}
                  placeholder="es. 500"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>UNITÀ DI MISURA</Text>
                <View style={styles.unitaChips}>
                  {unitaOptions.map(u => (
                    <TouchableOpacity
                      key={u}
                      style={[styles.unitaChip, nuovoServizio.unita === u && styles.unitaChipActive]}
                      onPress={() => setNuovoServizio(s => ({ ...s, unita: u }))}
                    >
                      <Text style={[styles.unitaChipText, nuovoServizio.unita === u && styles.unitaChipTextActive]}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {nuovoServizio.nome && (
              <View style={styles.previewBox}>
                <Text style={styles.previewLabel}>ANTEPRIMA</Text>
                <Text style={styles.previewNome}>{nuovoServizio.nome}</Text>
                {nuovoServizio.descrizione ? <Text style={styles.previewDesc}>{nuovoServizio.descrizione}</Text> : null}
                {nuovoServizio.costo ? (
                  <Text style={styles.previewCosto}>€{nuovoServizio.costo} / {nuovoServizio.unita}</Text>
                ) : null}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F8FA' },
  header: { backgroundColor: '#0D1B2A', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  backBtn: { padding: 4, width: 50 },
  backText: { color: '#9CA3AF', fontSize: 22 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  scroll: { flex: 1 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', gap: 8 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#0D1B2A' },
  cardSub: { fontSize: 12, color: '#9CA3AF' },
  label: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.8, marginTop: 4 },
  input: { backgroundColor: '#F7F8FA', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 12, fontSize: 14, color: '#0D1B2A' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#E5E7EB' },
  chipActive: { backgroundColor: '#0D1B2A', borderColor: '#0D1B2A' },
  chipText: { fontSize: 13, color: '#6B7280' },
  chipTextActive: { color: '#fff', fontWeight: '500' },
  addBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#0E9F8E', justifyContent: 'center', alignItems: 'center' },
  addBtnText: { color: '#fff', fontSize: 22, fontWeight: '300', lineHeight: 28 },
  emptyServizi: { alignItems: 'center', paddingVertical: 24, gap: 6 },
  emptyServiziIcon: { fontSize: 32 },
  emptyServiziText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  emptyServiziSub: { fontSize: 12, color: '#9CA3AF' },
  servizioRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  servizioLeft: { flex: 1, gap: 2 },
  servizioNome: { fontSize: 14, fontWeight: '600', color: '#0D1B2A' },
  servizioDesc: { fontSize: 12, color: '#9CA3AF', lineHeight: 16 },
  servizioRight: { alignItems: 'flex-end', gap: 4 },
  servizioCosto: { fontSize: 13, fontWeight: '600', color: '#0E9F8E' },
  servizioActions: { flexDirection: 'row', gap: 8 },
  servizioActionBtn: { padding: 4 },
  servizioActionText: { fontSize: 16 },
  saveBtn: { backgroundColor: '#0D1B2A', borderRadius: 14, padding: 16, alignItems: 'center' as const },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  logoPreview: { width: '100%', height: 80, backgroundColor: '#F7F8FA', borderRadius: 10 },
  logoPlaceholder: { width: '100%', height: 80, backgroundColor: '#F7F8FA', borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed' as const },
  logoPlaceholderText: { fontSize: 13, color: '#9CA3AF' },
  logoBtn: { backgroundColor: '#0D1B2A', borderRadius: 12, padding: 12, alignItems: 'center' as const },
  logoBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' as const },
  modalContainer: { flex: 1, backgroundColor: '#F7F8FA' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56, backgroundColor: '#0D1B2A' },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalClose: { color: '#9CA3AF', fontSize: 20, width: 40 },
  modalSave: { color: '#0E9F8E', fontSize: 15, fontWeight: '600' as const, width: 40, textAlign: 'right' as const },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.8 },
  fieldInput: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 12, fontSize: 14, color: '#0D1B2A' },
  costoRow: { flexDirection: 'row', gap: 12 },
  unitaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  unitaChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F7F8FA' },
  unitaChipActive: { backgroundColor: '#0D1B2A', borderColor: '#0D1B2A' },
  unitaChipText: { fontSize: 11, color: '#6B7280' },
  unitaChipTextActive: { color: '#fff', fontWeight: '500' },
  previewBox: { backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#0E9F8E', gap: 4 },
  previewLabel: { fontSize: 10, fontWeight: '600', color: '#0E9F8E', letterSpacing: 0.8 },
  previewNome: { fontSize: 15, fontWeight: '600', color: '#0D1B2A' },
  previewDesc: { fontSize: 12, color: '#6B7280' },
  previewCosto: { fontSize: 14, fontWeight: '700', color: '#0E9F8E', marginTop: 4 },
  fiscaleBtn: { backgroundColor: '#fff', borderRadius: 14, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  coloriGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  coloreChip: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  coloreChipActive: { borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 4 },
  coloreChipCheck: { color: '#fff', fontSize: 16, fontWeight: '700' as const },
  coloreCustomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  colorePreviewBox: { width: 28, height: 28, borderRadius: 6 },
  firmaPreview: { fontSize: 22, color: '#374151', fontStyle: 'italic' as const, paddingVertical: 8, textAlign: 'center' as const },
fiscaleBtnText: { fontSize: 14, color: '#0D1B2A', fontWeight: '500' },
fiscaleBtnArrow: { fontSize: 18, color: '#9CA3AF' },
})