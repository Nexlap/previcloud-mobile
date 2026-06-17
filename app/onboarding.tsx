import { Audio } from 'expo-av'
import Constants from 'expo-constants'
import { router } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Alert, BackHandler } from 'react-native'
import { elaboraServiziDaTesto } from '../lib/api/listinoSmart'
import { completaOnboarding, generaPreviewOnboarding, tokenOnboarding } from '../lib/api/onboarding'
import { OnboardingAziendaStep } from '../lib/components/onboarding/OnboardingAziendaStep'
import { OnboardingServiziStep } from '../lib/components/onboarding/OnboardingServiziStep'
import { OnboardingTemplateStep } from '../lib/components/onboarding/OnboardingTemplateStep'
import { OnboardingWelcomeStep } from '../lib/components/onboarding/OnboardingWelcomeStep'
import { DEMO_NOME_AZIENDA, DEMO_PREVENTIVO, generaTestoDemo } from '../lib/features/onboarding/demo'
import { scalaHtmlPreviewOnboarding } from '../lib/features/onboarding/preview'
import { serviziDaTesto } from '../lib/features/onboarding/serviziDaTesto'
import { avviaRegistrazioneListinoSmart, fermaRegistrazioneServiziSmart, scattaFotoServiziSmart, scegliFotoServiziSmart } from '../lib/features/listino/media'
import { ServizioForm } from '../lib/types'
import { errorMessage } from '../lib/utils/errors'

export default function Onboarding() {
  const [step, setStep] = useState(0)
  const [stepMassimoRaggiunto, setStepMassimoRaggiunto] = useState(0)
  const [saving, setSaving] = useState(false)
  const [elaborando, setElaborando] = useState(false)
  const backendUrl = Constants.expoConfig?.extra?.backendUrl

  const [templateScelto, setTemplateScelto] = useState('pulito')
  const [htmlPreview, setHtmlPreview] = useState('')
  const [caricandoPreview, setCaricandoPreview] = useState(false)
  const previewTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [nomeAzienda, setNomeAzienda] = useState('')
  const [citta, setCitta] = useState('')
  const [categoria, setCategoria] = useState('')
  const [firmaNome, setFirmaNome] = useState('')

  const [modalitaServizi, setModalitaServizi] = useState<'testo' | 'manuale'>('testo')
  const [testoServizi, setTestoServizi] = useState('')
  const [servizi, setServizi] = useState<Omit<ServizioForm, 'id'>[]>([])
  const [nuovoServizio, setNuovoServizio] = useState({ nome: '', descrizione: '', costo: '', unita: 'ora' })
  const [listinoTab, setListinoTab] = useState<'testo' | 'foto' | 'vocale'>('testo')
  const [registrando, setRegistrando] = useState(false)
  const [recording, setRecording] = useState<Audio.Recording | null>(null)
  const [elaborandoMedia, setElaborandoMedia] = useState(false)

  async function elaboraServiziAI() {
    if (!testoServizi.trim()) return
    setElaborando(true)
    try {
      const token = await tokenOnboarding()
      if (!token) return
      const data = await elaboraServiziDaTesto({ backendUrl, token, testo: testoServizi })
      if (data.servizi) {
        setServizi(data.servizi)
        setModalitaServizi('manuale')
      }
    } catch {
      Alert.alert('Errore', 'Impossibile elaborare i servizi')
    } finally {
      setElaborando(false)
    }
  }

  async function gestisciFotoServiziOnboarding(sorgente: 'galleria' | 'camera') {
    setElaborandoMedia(true)
    try {
      const token = await tokenOnboarding()
      if (!token) return
      const result = sorgente === 'galleria'
        ? await scegliFotoServiziSmart({ backendUrl, token })
        : await scattaFotoServiziSmart({ backendUrl, token })

      if (result.permissionDenied === 'gallery') { Alert.alert('Permesso negato', 'Serve accesso alla galleria.'); return }
      if (result.permissionDenied === 'camera') { Alert.alert('Permesso negato', 'Serve accesso alla fotocamera.'); return }
      if (result.canceled) return
      if (result.servizi.length) {
        setServizi(result.servizi)
        setModalitaServizi('manuale')
      } else {
        Alert.alert('Nessun servizio trovato', 'Prova con un\'altra foto.')
      }
    } catch { Alert.alert('Errore', 'Impossibile elaborare la foto') }
    finally { setElaborandoMedia(false) }
  }

  async function toggleRegistrazioneServiziOnboarding() {
    if (registrando) {
      setRegistrando(false)
      if (!recording) return
      setRecording(null)
      setElaborandoMedia(true)
      try {
        const token = await tokenOnboarding()
        if (!token) return
        const serviziEstratti = await fermaRegistrazioneServiziSmart(recording, { backendUrl, token })
        if (serviziEstratti.length) {
          setServizi(serviziEstratti)
          setModalitaServizi('manuale')
        } else {
          Alert.alert('Nessun servizio trovato', 'Riprova descrivendo meglio i servizi.')
        }
      } catch { Alert.alert('Errore', 'Impossibile elaborare il vocale') }
      finally { setElaborandoMedia(false) }
      return
    }

    const rec = await avviaRegistrazioneListinoSmart()
    if (!rec) { Alert.alert('Permesso negato', 'Serve accesso al microfono.'); return }
    setRecording(rec)
    setRegistrando(true)
  }

  async function aggiornaPreview(tmpl: string) {
    setCaricandoPreview(true)
    try {
      const token = await tokenOnboarding()
      if (!token) return
      const categoriaDemo = categoria && DEMO_PREVENTIVO[categoria] ? categoria : 'altro'
      const nomeAziendaDemo = DEMO_NOME_AZIENDA[categoriaDemo]
      const testoDemo = generaTestoDemo(categoriaDemo, tmpl === 'artigiano')
      const data = await generaPreviewOnboarding({
        backendUrl,
        token,
        testo: testoDemo,
        template: tmpl,
        demoProfile: {
          nome_azienda: nomeAziendaDemo,
          citta: 'Roma',
          piva: '12345678901',
          telefono: '06 1234567',
          firma_nome: firmaNome.trim() || nomeAziendaDemo,
        },
        demoCliente: {
          nome: 'Marco Bianchi',
          email: 'marco.bianchi@email.it',
          telefono: '333 1234567',
          indirizzo: 'Via Roma 24, 00100 Roma',
        },
      })
      if (data.html) setHtmlPreview(scalaHtmlPreviewOnboarding(data.html))
    } catch {}
    setCaricandoPreview(false)
  }

  function aggiungiServizio() {
    if (!nuovoServizio.nome.trim()) return
    setServizi(s => [...s, { ...nuovoServizio }])
    setNuovoServizio({ nome: '', descrizione: '', costo: '', unita: 'ora' })
  }

  function rimuoviServizio(i: number) {
    setServizi(s => s.filter((_, idx) => idx !== i))
  }

  function puoNavigareAlloStep(targetStep: number) {
    if (targetStep >= 2 && (!nomeAzienda.trim() || !categoria)) return false
    return targetStep >= 0 && targetStep <= 3
  }

  function vaiAlloStep(targetStep: number) {
    if (!puoNavigareAlloStep(targetStep)) return
    setStep(targetStep)
    setStepMassimoRaggiunto(s => Math.max(s, targetStep))
    if (targetStep === 3) aggiornaPreview(templateScelto)
  }

  function avanzaDaServizi() {
    if (modalitaServizi === 'testo' && listinoTab === 'testo' && testoServizi.trim() !== '' && servizi.length === 0) {
      setServizi(serviziDaTesto(testoServizi))
    }
    vaiAlloStep(3)
  }

  function handleTemplateChange(id: string) {
    setTemplateScelto(id)
    if (previewTimeout.current) clearTimeout(previewTimeout.current)
    previewTimeout.current = setTimeout(() => aggiornaPreview(id), 300)
  }

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step > 0) {
        setStep(step - 1)
        return true
      }

      Alert.alert(
        'Vuoi uscire?',
        'La configurazione non è completa',
        [
          { text: 'Annulla', style: 'cancel' },
          { text: 'Esci', style: 'destructive', onPress: () => BackHandler.exitApp() },
        ]
      )
      return true
    })

    return () => subscription.remove()
  }, [step])

  async function completa() {
    setSaving(true)
    try {
      const { error } = await completaOnboarding({
        nomeAzienda,
        citta,
        categoria,
        templateScelto,
        firmaNome,
        servizi,
      })
      if (error) throw error

      router.replace('/(tabs)')
    } catch (err: unknown) {
      Alert.alert('Errore', errorMessage(err))
    }
    setSaving(false)
  }

  if (step === 0) {
    return <OnboardingWelcomeStep onStart={() => vaiAlloStep(1)} />
  }

  if (step === 1) {
    return (
      <OnboardingAziendaStep
        stepMassimoRaggiunto={stepMassimoRaggiunto}
        nomeAzienda={nomeAzienda}
        citta={citta}
        categoria={categoria}
        firmaNome={firmaNome}
        onNomeAziendaChange={setNomeAzienda}
        onCittaChange={setCitta}
        onCategoriaChange={setCategoria}
        onFirmaNomeChange={setFirmaNome}
        onNavigate={vaiAlloStep}
        canNavigate={puoNavigareAlloStep}
        onNext={() => vaiAlloStep(2)}
      />
    )
  }

  if (step === 2) {
    return (
      <OnboardingServiziStep
        stepMassimoRaggiunto={stepMassimoRaggiunto}
        categoria={categoria}
        modalitaServizi={modalitaServizi}
        listinoTab={listinoTab}
        testoServizi={testoServizi}
        servizi={servizi}
        nuovoServizio={nuovoServizio}
        elaborando={elaborando}
        elaborandoMedia={elaborandoMedia}
        registrando={registrando}
        onModalitaServiziChange={setModalitaServizi}
        onListinoTabChange={setListinoTab}
        onTestoServiziChange={setTestoServizi}
        onNuovoServizioChange={setNuovoServizio}
        onElaboraServiziAI={elaboraServiziAI}
        onGestisciFoto={gestisciFotoServiziOnboarding}
        onToggleRegistrazione={toggleRegistrazioneServiziOnboarding}
        onRimuoviServizio={rimuoviServizio}
        onAggiungiServizio={aggiungiServizio}
        onNavigate={vaiAlloStep}
        canNavigate={puoNavigareAlloStep}
        onNext={avanzaDaServizi}
      />
    )
  }

  if (step === 3) {
    return (
      <OnboardingTemplateStep
        stepMassimoRaggiunto={stepMassimoRaggiunto}
        templateScelto={templateScelto}
        htmlPreview={htmlPreview}
        caricandoPreview={caricandoPreview}
        saving={saving}
        onTemplateChange={handleTemplateChange}
        onNavigate={vaiAlloStep}
        canNavigate={puoNavigareAlloStep}
        onComplete={completa}
      />
    )
  }

  return null
}
