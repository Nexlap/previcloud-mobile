import { Audio } from 'expo-av'
import Constants from 'expo-constants'
import * as ImagePicker from 'expo-image-picker'
import { router, useNavigation } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native'
import { ServizioForm } from '../../lib/types'
import { caricaSettingsData, inviaSegnalazioneSettings, salvaProfiloSettings, sessionToken, uploadLogoSettings } from '../../lib/api/settings'
import { avviaRegistrazioneListinoSmart, elaboraListinoDaTestoSmart, fermaRegistrazioneListinoSmart, scattaFotoListinoSmart, scegliFotoListinoSmart } from '../../lib/features/listino/media'
import { errorMessage } from '../../lib/utils/errors'

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
  const [servizi, setServizi] = useState<ServizioForm[]>([])
  const [mostraModalListino, setMostraModalListino] = useState(false)
  const [testoListino, setTestoListino] = useState('')
  const [elaborandoListino, setElaborandoListino] = useState(false)
  const [mostraModalSegnalazione, setMostraModalSegnalazione] = useState(false)
  const [segnalazione, setSegnalazione] = useState({ tipo: 'bug', titolo: '', descrizione: '', schermata: '' })
  const [inviandoSegnalazione, setInviandoSegnalazione] = useState(false)
  const [modificheNonSalvate, setModificheNonSalvate] = useState(false)
  const formIniziale = useRef<typeof form | null>(null)
  const formRef = useRef(form)
  useEffect(() => { formRef.current = form }, [form])
  const navigation = useNavigation()
  const backendUrl = Constants.expoConfig?.extra?.backendUrl

  const categorie = ['videomaker', 'fotografo', 'catering', 'falegname', 'estetista', 'elettricista', 'idraulico', 'imbianchino', 'altro']
  const toni = ['professionale e diretto', 'cordiale e disponibile', 'formale e preciso', 'semplice e informale']
  const [listinoTab, setListinoTab] = useState<'testo' | 'foto' | 'vocale'>('testo')
  const [registrando, setRegistrando] = useState(false)
  const [recording, setRecording] = useState<Audio.Recording | null>(null)
  

  async function inviaSegnalazione() {
    if (!segnalazione.titolo.trim() || !segnalazione.descrizione.trim()) {
      Alert.alert('Campi obbligatori', 'Inserisci titolo e descrizione')
      return
    }
    setInviandoSegnalazione(true)
    const { error, user } = await inviaSegnalazioneSettings(segnalazione)
    if (!user) return
    setInviandoSegnalazione(false)
    if (error) { Alert.alert('Errore', 'Impossibile inviare la segnalazione'); return }
    Alert.alert('Inviata', 'Grazie! Analizzeremo il problema il prima possibile.')
    setSegnalazione({ tipo: 'bug', titolo: '', descrizione: '', schermata: '' })
    setMostraModalSegnalazione(false)
  }

  async function elaboraListinoAI() {
    if (!testoListino.trim()) return
    setElaborandoListino(true)
    try {
      const inseriti = await elaboraListinoDaTestoSmart({ backendUrl, token, testo: testoListino, ordineBase: servizi.length })
      if (!inseriti.length) { Alert.alert('Nessun servizio trovato', 'Prova a essere piu specifico.'); setElaborandoListino(false); return }
      setServizi(s => [...s, ...inseriti])
      setTestoListino(''); setMostraModalListino(false)
      Alert.alert('Servizi aggiunti', `${inseriti.length} servizi aggiunti al tuo listino.`)
    } catch { Alert.alert('Errore', 'Impossibile elaborare i servizi') }
    setElaborandoListino(false)
  }

  async function gestisciFotoListinoSmart(sorgente: 'galleria' | 'camera') {
    setElaborandoListino(true)
    try {
      const result = sorgente === 'galleria'
        ? await scegliFotoListinoSmart({ backendUrl, token, ordineBase: servizi.length })
        : await scattaFotoListinoSmart({ backendUrl, token, ordineBase: servizi.length })

      if (result.permissionDenied === 'gallery') { Alert.alert('Permesso negato', 'Serve accesso alla galleria.'); return }
      if (result.permissionDenied === 'camera') { Alert.alert('Permesso negato', 'Serve accesso alla fotocamera.'); return }
      if (result.canceled) return
      if (result.empty) { Alert.alert('Nessun servizio trovato', 'Prova con un\'altra foto.'); return }

      setServizi(s => [...s, ...result.inseriti])
      setMostraModalListino(false); setListinoTab('testo')
      Alert.alert('Servizi aggiunti', `${result.inseriti.length} servizi aggiunti al tuo listino.`)
    } catch { Alert.alert('Errore', 'Impossibile elaborare la foto') }
    setElaborandoListino(false)
  }

  async function toggleRegistrazioneListinoSmart() {
    if (registrando) {
      setRegistrando(false)
      if (!recording) return
      setRecording(null)
      setElaborandoListino(true)
      try {
        const inseriti = await fermaRegistrazioneListinoSmart(recording, { backendUrl, token, ordineBase: servizi.length })
        if (!inseriti.length) { Alert.alert('Nessun servizio trovato', 'Riprova descrivendo meglio i servizi.'); return }
        setServizi(s => [...s, ...inseriti])
        setMostraModalListino(false); setListinoTab('testo')
        Alert.alert('Servizi aggiunti', `${inseriti.length} servizi aggiunti al tuo listino.`)
      } catch { Alert.alert('Errore', 'Impossibile elaborare il vocale') }
      setElaborandoListino(false)
      return
    }

    const rec = await avviaRegistrazioneListinoSmart()
    if (!rec) { Alert.alert('Permesso negato', 'Serve accesso al microfono.'); return }
    setRecording(rec)
    setRegistrando(true)
  }

  useEffect(() => {
    carica()
    sessionToken().then(setToken)
  }, [])

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (!modificheNonSalvate) return
      e.preventDefault()
      Alert.alert('Modifiche non salvate', 'Vuoi salvare le modifiche al profilo?', [
        { text: 'Abbandona', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
        { text: 'Continua', style: 'cancel' },
        { text: 'Salva', onPress: async () => {
  await salvaProfiloSettings(formRef.current)
  navigation.dispatch(e.data.action)
}}
      ])
    })
    return unsubscribe
  }, [modificheNonSalvate, navigation])

  async function carica() {
    const data = await caricaSettingsData()
    if (!data) { router.replace('/(auth)/login'); return }
    if (data.form) {
      setForm(data.form)
      formIniziale.current = data.form
    }
    if (data.logoUrl) setLogoUrl(data.logoUrl)
    if (data.servizi) setServizi(data.servizi)

    setLoading(false)
  }

  async function salva() {
    setSaving(true)
    const { error, user } = await salvaProfiloSettings(form)
    if (!user) return
    setSaving(false)
    if (error) Alert.alert('Errore', error.message)
    else { Alert.alert('✓ Salvato', 'Profilo aggiornato.'); setModificheNonSalvate(false); if (formIniziale.current) formIniziale.current = form }
  }

  function set(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }))
    setModificheNonSalvate(true)
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

      const logoUrl = await uploadLogoSettings({
        backendUrl,
        token,
        logoBase64: asset.base64,
        mimeType: asset.mimeType || 'image/jpeg',
      })
      setLogoUrl(logoUrl)
      Alert.alert('✓ Logo caricato', 'Apparirà su tutti i tuoi preventivi PDF.')
    } catch (err: unknown) {
      Alert.alert('Errore', errorMessage(err))
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
        <TouchableOpacity style={styles.fiscaleBtn} onPress={() => router.push('/screens/listino')}>
          <Text style={styles.fiscaleBtnText}>📋 I miei servizi</Text>
          <Text style={styles.fiscaleBtnArrow}>›</Text>
        </TouchableOpacity>

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
          onPress={() => router.push('/screens/pagamenti')}
        >
          <Text style={styles.fiscaleBtnText}>💳 Metodi di pagamento</Text>
          <Text style={styles.fiscaleBtnArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
  style={styles.fiscaleBtn}
  onPress={() => router.push('/screens/fiscale')}
>
  <Text style={styles.fiscaleBtnText}>🧾 Regime fiscale e tasse</Text>
  <Text style={styles.fiscaleBtnArrow}>›</Text>
</TouchableOpacity>

        <TouchableOpacity style={styles.fiscaleBtn} onPress={() => setMostraModalSegnalazione(true)}>
          <Text style={styles.fiscaleBtnText}>🐛 Segnala un problema</Text>
          <Text style={styles.fiscaleBtnArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={salva} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Salva impostazioni</Text>}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal segnalazione */}
      <Modal visible={mostraModalSegnalazione} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setMostraModalSegnalazione(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Segnala un problema</Text>
            <TouchableOpacity onPress={inviaSegnalazione} disabled={inviandoSegnalazione}>
              {inviandoSegnalazione
                ? <ActivityIndicator color="#0E9F8E" size="small" />
                : <Text style={styles.modalSave}>Invia</Text>
              }
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>TIPO</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                {[{ key: 'bug', label: '🐛 Bug' }, { key: 'suggerimento', label: '💡 Suggerimento' }, { key: 'altro', label: '📋 Altro' }].map(t => (
                  <TouchableOpacity key={t.key}
                    style={[styles.unitaChip, segnalazione.tipo === t.key && styles.unitaChipActive, { paddingHorizontal: 14, paddingVertical: 10 }]}
                    onPress={() => setSegnalazione(s => ({ ...s, tipo: t.key }))}>
                    <Text style={[styles.unitaChipText, segnalazione.tipo === t.key && styles.unitaChipTextActive, { fontSize: 13 }]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>TITOLO *</Text>
              <TextInput style={styles.fieldInput} value={segnalazione.titolo}
                onChangeText={v => setSegnalazione(s => ({ ...s, titolo: v }))}
                placeholder="es. Il PDF non si genera" placeholderTextColor="#9CA3AF" autoFocus />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>DESCRIZIONE *</Text>
              <TextInput style={[styles.fieldInput, { height: 120, textAlignVertical: 'top' }]}
                value={segnalazione.descrizione}
                onChangeText={v => setSegnalazione(s => ({ ...s, descrizione: v }))}
                placeholder="Descrivi il problema nel dettaglio..." placeholderTextColor="#9CA3AF" multiline />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>SCHERMATA (opzionale)</Text>
              <TextInput style={styles.fieldInput} value={segnalazione.schermata}
                onChangeText={v => setSegnalazione(s => ({ ...s, schermata: v }))}
                placeholder="es. Builder, Chat, Storico..." placeholderTextColor="#9CA3AF" />
            </View>
            <View style={{ backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#BFDBFE' }}>
              <Text style={{ fontSize: 12, color: '#1D4ED8', lineHeight: 18 }}>
                Le segnalazioni vengono analizzate entro 24-48 ore. Grazie per aiutarci a migliorare PreventivoAI!
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal listino smart */}
      <Modal visible={mostraModalListino} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setMostraModalListino(false); setListinoTab('testo') }}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Listino smart</Text>
            <View style={{ width: 40 }} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
            <View style={{ backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#BFDBFE' }}>
              <Text style={{ fontSize: 13, color: '#1D4ED8', lineHeight: 18 }}>
                Testo, foto o vocale — Claude struttura tutto e aggiunge i servizi al tuo listino.
              </Text>
            </View>

            {/* Tab selector */}
            <View style={{ flexDirection: 'row', backgroundColor: '#F7F8FA', borderRadius: 12, padding: 4, borderWidth: 1, borderColor: '#E5E7EB' }}>
              {([['testo', '📋 Testo'], ['foto', '📷 Foto'], ['vocale', '🎙 Vocale']] as const).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' as const }, listinoTab === key && { backgroundColor: '#0D1B2A' }]}
                  onPress={() => setListinoTab(key)}
                >
                  <Text style={[{ fontSize: 12, fontWeight: '500', color: '#9CA3AF' }, listinoTab === key && { color: '#fff' }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Tab Testo */}
            {listinoTab === 'testo' && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>I TUOI SERVIZI</Text>
                <TextInput
                  style={[styles.fieldInput, { height: 200, textAlignVertical: 'top' }]}
                  value={testoListino}
                  onChangeText={setTestoListino}
                  placeholder="es. Editing video: 300, Riprese mezza giornata: 400, Color grading: 150"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  autoFocus
                />
              </View>
            )}

            {/* Tab Foto */}
            {listinoTab === 'foto' && (
              <View style={{ gap: 12 }}>
                <Text style={{ fontSize: 13, color: '#6B7280', lineHeight: 18 }}>
                  Scatta o carica una foto del tuo listino prezzi — anche scritto a mano.
                </Text>
                <TouchableOpacity
                  style={{ backgroundColor: '#F7F8FA', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', borderStyle: 'dashed', padding: 32, alignItems: 'center', gap: 8 }}
                  onPress={() => gestisciFotoListinoSmart('galleria')}
                >
                  {elaborandoListino
                    ? <ActivityIndicator color="#0E9F8E" />
                    : <>
                        <Text style={{ fontSize: 36 }}>📷</Text>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#0D1B2A' }}>Scegli dalla galleria</Text>
                        <Text style={{ fontSize: 12, color: '#9CA3AF' }}>JPG, PNG — anche scritto a mano</Text>
                      </>
                  }
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ backgroundColor: '#F7F8FA', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 16, alignItems: 'center', gap: 6 }}
                  onPress={() => gestisciFotoListinoSmart('camera')}
                >
                  <Text style={{ fontSize: 36 }}>📸</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#0D1B2A' }}>Scatta una foto</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Tab Vocale */}
            {listinoTab === 'vocale' && (
              <View style={{ gap: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: '#6B7280', lineHeight: 18, textAlign: 'center' }}>
                  Descrivi i tuoi servizi a voce — prezzi, nomi, unità. Claude trascrive e struttura tutto.
                </Text>
                <TouchableOpacity
                  style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: registrando ? '#EF4444' : '#0D1B2A', justifyContent: 'center', alignItems: 'center', marginVertical: 8 }}
                  onPress={toggleRegistrazioneListinoSmart}
                >
                  {elaborandoListino
                    ? <ActivityIndicator color="#fff" size="large" />
                    : <Text style={{ fontSize: 36 }}>{registrando ? '⏹' : '🎙'}</Text>
                  }
                </TouchableOpacity>
                <Text style={{ fontSize: 13, color: registrando ? '#EF4444' : '#9CA3AF', fontWeight: '500' }}>
                  {elaborandoListino ? 'Elaborazione in corso...' : registrando ? 'Registrazione in corso — tocca per fermare' : 'Tocca per iniziare a registrare'}
                </Text>
              </View>
            )}

            {/* Bottone elabora per tab testo */}
            {listinoTab === 'testo' && (
              <TouchableOpacity
                style={[styles.saveBtn, (!testoListino.trim() || elaborandoListino) && styles.saveBtnDisabled]}
                onPress={elaboraListinoAI}
                disabled={!testoListino.trim() || elaborandoListino}
              >
                {elaborandoListino
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveBtnText}>Struttura con AI e aggiungi</Text>
                }
              </TouchableOpacity>
            )}

            <TouchableOpacity style={{ alignItems: 'center', padding: 8 }} onPress={() => { setMostraModalListino(false); setListinoTab('testo') }}>
              <Text style={{ fontSize: 13, color: '#9CA3AF' }}>Annulla</Text>
            </TouchableOpacity>
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
  segnalazioneBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', gap: 12 },
  segnalazioneBtnIcon: { fontSize: 22 },
  segnalazioneBtnText: { fontSize: 14, fontWeight: '600', color: '#0D1B2A' },
  segnalazioneBtnSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
})
