import { Audio } from 'expo-av'
import Constants from 'expo-constants'
import * as ImagePicker from 'expo-image-picker'
import { router, useNavigation } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import type { EventArg, NavigationAction } from '@react-navigation/native'
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, View
} from 'react-native'
import { ServizioForm } from '../../lib/types'
import { caricaSettingsData, inviaSegnalazioneSettings, salvaProfiloSettings, sessionToken, SettingsForm, uploadLogoSettings } from '../../lib/api/settings'
import { avviaRegistrazioneListinoSmart, elaboraListinoDaTestoSmart, fermaRegistrazioneListinoSmart, scattaFotoListinoSmart, scegliFotoListinoSmart } from '../../lib/features/listino/media'
import { SettingsHeader } from '../../lib/components/settings/SettingsHeader'
import { SettingsLinksSection } from '../../lib/components/settings/SettingsLinksSection'
import { ListinoSmartModal } from '../../lib/components/listino/ListinoSmartModal'
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
  const [segnalazione, setSegnalazione] = useState<SegnalazioneForm>({ tipo: 'bug', titolo: '', descrizione: '', schermata: '' })
  const [inviandoSegnalazione, setInviandoSegnalazione] = useState(false)
  const [modificheNonSalvate, setModificheNonSalvate] = useState(false)
  const formIniziale = useRef<SettingsForm | null>(null)
  const formRef = useRef(form)
  useEffect(() => { formRef.current = form }, [form])
  const navigation = useNavigation()
  const backendUrl = Constants.expoConfig?.extra?.backendUrl

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
    finally { setElaborandoListino(false) }
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

  function chiudiModalListino() {
    setMostraModalListino(false)
    setListinoTab('testo')
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

      <ListinoSmartModal
        visible={mostraModalListino}
        listinoTab={listinoTab}
        testoListino={testoListino}
        elaborandoListino={elaborandoListino}
        registrando={registrando}
        onClose={chiudiModalListino}
        onChangeTab={setListinoTab}
        onChangeTesto={setTestoListino}
        onElaboraTesto={elaboraListinoAI}
        onFotoGalleria={() => gestisciFotoListinoSmart('galleria')}
        onFotoCamera={() => gestisciFotoListinoSmart('camera')}
        onToggleRegistrazione={toggleRegistrazioneListinoSmart}
        testoPlaceholder="es. Editing video: 300, Riprese mezza giornata: 400, Color grading: 150"
        fotoHint="Scatta o carica una foto del tuo listino prezzi — anche scritto a mano."
        vocaleHint="Descrivi i tuoi servizi a voce — prezzi, nomi, unità. Claude trascrive e struttura tutto."
        vocaleStatusElaborando="Elaborazione in corso..."
        vocaleStatusRegistrando="Registrazione in corso — tocca per fermare"
        vocaleStatusIdle="Tocca per iniziare a registrare"
      />
    </KeyboardAvoidingView>
  )
}
