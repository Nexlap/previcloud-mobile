import Constants from 'expo-constants'
import * as ImagePicker from 'expo-image-picker'
import { router, useNavigation } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import type { EventArg, NavigationAction } from '@react-navigation/native'
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, View,
} from 'react-native'
import { caricaSettingsData, salvaProfiloSettings, sessionToken, SettingsForm, uploadLogoSettings } from '../../lib/api/settings'
import { SettingsHeader } from '../../lib/components/settings/SettingsHeader'
import { SettingsNavSection } from '../../lib/components/settings/SettingsNavSection'
import { SettingsSaveFooter } from '../../lib/components/settings/SettingsSaveFooter'
import { SettingsIdentitaSection } from '../../lib/components/settings/SettingsIdentitaSection'
import { SettingsColoreBrandRow } from '../../lib/components/settings/SettingsColoreBrandRow'
import { SettingsNotePagamentoRow } from '../../lib/components/settings/SettingsNotePagamentoRow'
import { SettingsDropdown } from '../../lib/components/settings/SettingsDropdown'
import { settingsStyles as styles } from '../../lib/components/settings/settingsStyles'
import { useTheme } from '../../lib/theme/ThemeContext'
import { TONI } from '../../lib/features/settings/constants'
import { MESSAGGI_CLIENTE_DEFAULT } from '../../lib/messaggiCliente'
import { errorMessage } from '../../lib/utils/errors'

type BeforeRemoveEvent = EventArg<'beforeRemove', true, { action: NavigationAction }>

export default function Settings() {
  const { colors } = useTheme()
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
    messaggi: MESSAGGI_CLIENTE_DEFAULT,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [logoUrl, setLogoUrl] = useState('')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [token, setToken] = useState('')
  const [modificheNonSalvate, setModificheNonSalvate] = useState(false)
  const formIniziale = useRef<SettingsForm | null>(null)
  const formRef = useRef(form)
  useEffect(() => { formRef.current = form }, [form])
  const navigation = useNavigation()
  const backendUrl = Constants.expoConfig?.extra?.backendUrl

  useEffect(() => {
    void carica()
    sessionToken().then(setToken)
  }, [])

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: BeforeRemoveEvent) => {
      if (!modificheNonSalvate) return
      e.preventDefault()
      Alert.alert('Modifiche non salvate', 'Vuoi salvare le modifiche?', [
        { text: 'Abbandona', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
        { text: 'Continua', style: 'cancel' },
        {
          text: 'Salva',
          onPress: async () => {
            await salvaProfiloSettings(formRef.current)
            navigation.dispatch(e.data.action)
          },
        },
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
    else {
      Alert.alert('Salvato', 'Impostazioni aggiornate.')
      setModificheNonSalvate(false)
      if (formIniziale.current) formIniziale.current = form
    }
  }

  function set(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }))
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
      setModificheNonSalvate(true)
      Alert.alert('Logo caricato', 'Apparirà su tutti i tuoi preventivi PDF.')
    } catch (err: unknown) {
      Alert.alert('Errore', errorMessage(err))
    }
    setUploadingLogo(false)
  }

  if (loading) return (
    <View style={[styles.center, { backgroundColor: colors.bg }]}>
      <ActivityIndicator size="large" color="#0E9F8E" />
    </View>
  )

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <SettingsHeader />

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
        <SettingsIdentitaSection
          form={form}
          logoUrl={logoUrl}
          uploadingLogo={uploadingLogo}
          onSetField={set}
          onScegliLogo={scegliLogo}
        />

        <SettingsColoreBrandRow
          value={form.colore_brand}
          onChange={v => set('colore_brand', v)}
        />

        <SettingsDropdown
          label="Tono di comunicazione"
          value={form.tono}
          options={TONI}
          onChange={v => set('tono', v)}
        />

        <SettingsNotePagamentoRow
          value={form.note_pagamento}
          onChange={v => set('note_pagamento', v)}
        />

        <SettingsNavSection
          items={[
            {
              title: 'I miei servizi',
              subtitle: 'Il tuo listino prezzi per i preventivi',
              icon: 'list',
              onPress: () => router.push('/screens/listino'),
            },
            {
              title: 'Metodi di pagamento',
              subtitle: 'Bonifico, PayPal, contanti, carta e Stripe',
              icon: 'credit-card',
              onPress: () => router.push('/screens/pagamenti'),
            },
            {
              title: 'Comunicazione cliente',
              subtitle: 'Messaggi, link firma digitale e reminder',
              icon: 'message-circle',
              onPress: () => router.push('/screens/messaggi-cliente'),
            },
          ]}
        />

        <SettingsSaveFooter saving={saving} onSave={() => void salva()} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
