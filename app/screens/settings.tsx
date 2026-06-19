import Constants from 'expo-constants'
import * as ImagePicker from 'expo-image-picker'
import { router, useNavigation } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import type { EventArg, NavigationAction } from '@react-navigation/native'
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, View
} from 'react-native'
import { caricaSettingsData, inviaSegnalazioneSettings, salvaProfiloSettings, sessionToken, SettingsForm, uploadLogoSettings } from '../../lib/api/settings'
import { SettingsHeader } from '../../lib/components/settings/SettingsHeader'
import { SettingsLinksSection } from '../../lib/components/settings/SettingsLinksSection'
import { SettingsProfileCards } from '../../lib/components/settings/SettingsProfileCards'
import { SegnalazioneForm, SettingsSegnalazioneModal } from '../../lib/components/settings/SettingsSegnalazioneModal'
import { settingsStyles as styles } from '../../lib/components/settings/settingsStyles'
import { errorMessage } from '../../lib/utils/errors'

type BeforeRemoveEvent = EventArg<'beforeRemove', true, { action: NavigationAction }>

export default function Settings() {
  const [form, setForm] = useState<SettingsForm>({
    nome_azienda: '',
    categoria: 'videomaker',
    citta: '',
    piva: '',
    telefono: '',
    tono: 'professionale e diretto',
    colore_brand: '0D1B2A',
    note_pagamento: '',
    firma_nome: '',
    reminder_firma_giorni: 3,
    reminder_firma_globale_disabilitato: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [logoUrl, setLogoUrl] = useState('')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [token, setToken] = useState('')
  const [mostraModalSegnalazione, setMostraModalSegnalazione] = useState(false)
  const [segnalazione, setSegnalazione] = useState<SegnalazioneForm>({ tipo: 'bug', titolo: '', descrizione: '', schermata: '' })
  const [inviandoSegnalazione, setInviandoSegnalazione] = useState(false)
  const [modificheNonSalvate, setModificheNonSalvate] = useState(false)
  const formIniziale = useRef<SettingsForm | null>(null)
  const formRef = useRef(form)
  useEffect(() => { formRef.current = form }, [form])
  const navigation = useNavigation()
  const backendUrl = Constants.expoConfig?.extra?.backendUrl

  async function inviaSegnalazione() {
    if (!segnalazione.titolo.trim() || !segnalazione.descrizione.trim()) {
      Alert.alert('Campi obbligatori', 'Inserisci titolo e descrizione')
      return
    }
    setInviandoSegnalazione(true)
    const { error, user } = await inviaSegnalazioneSettings(segnalazione)
    if (!user) {
      setInviandoSegnalazione(false)
      return
    }
    setInviandoSegnalazione(false)
    if (error) { Alert.alert('Errore', 'Impossibile inviare la segnalazione'); return }
    Alert.alert('Inviata', 'Grazie! Analizzeremo il problema il prima possibile.')
    setSegnalazione({ tipo: 'bug', titolo: '', descrizione: '', schermata: '' })
    setMostraModalSegnalazione(false)
  }

  useEffect(() => {
    carica()
    sessionToken().then(setToken)
  }, [])

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: BeforeRemoveEvent) => {
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

    setLoading(false)
  }

  async function salva() {
    setSaving(true)
    const { error, user } = await salvaProfiloSettings(form)
    if (!user) {
      setSaving(false)
      return
    }
    setSaving(false)
    if (error) Alert.alert('Errore', error.message)
    else { Alert.alert('✓ Salvato', 'Profilo aggiornato.'); setModificheNonSalvate(false); if (formIniziale.current) formIniziale.current = form }
  }

  function set(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }))
    setModificheNonSalvate(true)
  }

  function patchForm(patch: Partial<SettingsForm>) {
    setForm(f => ({ ...f, ...patch }))
    setModificheNonSalvate(true)
  }

  async function scegliLogo() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') { Alert.alert('Permesso negato', 'Serve accesso alla galleria.'); return }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true, aspect: [4, 1], quality: 0.3, base64: true, exif: false,
    })
    if (result.canceled || !result.assets[0]) return

    setUploadingLogo(true)
    try {
      const asset = result.assets[0]
      if (!asset.base64) throw new Error('Impossibile leggere l\'immagine')
      const sizeKB = (asset.base64.length * 0.75) / 1024
      if (sizeKB > 500) { Alert.alert('Immagine troppo grande', 'Max 500KB'); setUploadingLogo(false); return }

      const nuovoLogoUrl = await uploadLogoSettings({
        backendUrl,
        token,
        logoBase64: asset.base64,
        mimeType: asset.mimeType || 'image/jpeg',
      })
      setLogoUrl(nuovoLogoUrl)
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
      <SettingsHeader />

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16, gap: 14 }}>
        <SettingsProfileCards
          form={form}
          logoUrl={logoUrl}
          uploadingLogo={uploadingLogo}
          onSetField={set}
          onPatchForm={patchForm}
          onScegliLogo={scegliLogo}
        />

        <SettingsLinksSection
          links={[
            { label: '📋 I miei servizi', onPress: () => router.push('/screens/listino') },
            { label: '💳 Metodi di pagamento', onPress: () => router.push('/screens/pagamenti') },
            { label: '🧾 Regime fiscale e tasse', onPress: () => router.push('/screens/fiscale') },
            { label: '🐛 Segnala un problema', onPress: () => setMostraModalSegnalazione(true) },
          ]}
          saving={saving}
          onSave={salva}
        />
      </ScrollView>

      <SettingsSegnalazioneModal
        visible={mostraModalSegnalazione}
        segnalazione={segnalazione}
        inviando={inviandoSegnalazione}
        onClose={() => setMostraModalSegnalazione(false)}
        onChange={setSegnalazione}
        onInvia={inviaSegnalazione}
      />
    </KeyboardAvoidingView>
  )
}
