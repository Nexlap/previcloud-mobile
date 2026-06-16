import { Audio } from 'expo-av'
import Constants from 'expo-constants'
import { router } from 'expo-router'
import { useRef, useState } from 'react'
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native'
import WebView from 'react-native-webview'
import { supabase } from '../lib/supabase'
import * as ImagePicker from 'expo-image-picker'
import { ServizioForm } from '../lib/types'


const CATEGORIE = ['videomaker', 'fotografo', 'catering', 'falegname', 'estetista', 'elettricista', 'idraulico', 'imbianchino', 'consulente', 'altro']
const UNITA = ['cad', 'ora', 'giorno', 'mq', 'set', 'progetto']

// Esempi listino per categoria
const ESEMPI_LISTINO: Record<string, string> = {
  videomaker: 'Riprese mezza giornata: 400€\nMontaggio video: 300€\nColor grading: 150€\nReel social: 200€',
  fotografo: 'Servizio foto evento: 500€\nRitocco foto (set 10): 150€\nBook professionale: 400€\nFoto prodotto: 80€/cad',
  catering: 'Menu pranzo (a persona): 35€\nMenu cena (a persona): 50€\nAperitivo: 20€/persona\nAllestimento tavoli: 200€',
  falegname: 'Montaggio mobile: 150€\nRiparazione porta: 80€\nPosa parquet (mq): 25€\nProgetto su misura: 500€',
  estetista: 'Piega e colore: 80€\nTaglio capelli: 35€\nManicure: 30€\nTrattamento viso: 60€',
  elettricista: 'Installazione presa: 80€\nCertificazione impianto: 200€\nIntervento urgente: 120€\nQuadro elettrico: 350€',
  idraulico: 'Riparazione perdita: 100€\nSostituzione rubinetto: 80€\nInstallazione caldaia: 500€\nIntervento urgente: 150€',
  imbianchino: 'Tinteggiatura stanza (mq): 8€\nPreparazione pareti: 5€/mq\nSmaltimento vernice: 50€\nPosa carta da parati: 15€/mq',
  consulente: 'Consulenza oraria: 80€\nProgetto strategico: 1500€\nFormazione (mezza giornata): 400€\nReport analitico: 600€',
  altro: 'Servizio base: 100€\nServizio premium: 200€\nConsulenza: 80€/ora\nProgetto completo: 500€',
}

export default function Onboarding() {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [elaborando, setElaborando] = useState(false)
  const backendUrl = Constants.expoConfig?.extra?.backendUrl

  // Step template
  const [templateScelto, setTemplateScelto] = useState('pulito')
  const [htmlPreview, setHtmlPreview] = useState('')
  const [caricandoPreview, setCaricandoPreview] = useState(false)
  const previewTimeout = useRef<any>(null)

  // Step 2 — dati azienda
  const [nomeAzienda, setNomeAzienda] = useState('')
  const [citta, setCitta] = useState('')
  const [categoria, setCategoria] = useState('')

  // Step 3 — servizi
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
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch(`${backendUrl}/api/elabora-servizi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ testo: testoServizi })
      })
      const data = await res.json()
      if (data.servizi) {
        setServizi(data.servizi)
        setModalitaServizi('manuale')
      }
    } catch {
      Alert.alert('Errore', 'Impossibile elaborare i servizi')
    }
    setElaborando(false)
  }

  async function aggiornaPreview(tmpl: string) {
    setCaricandoPreview(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const totale = servizi.reduce((a, s) => a + (parseFloat(s.costo) || 0), 0)
      const testoDemo = servizi.length > 0
        ? `PREVENTIVO\nData: ${new Date().toLocaleDateString('it-IT')}  |  Validità: 30 giorni\n\nSERVIZI:\n\n${servizi.map(s => `SERVIZIO: ${s.nome}\nPREZZO: €${s.costo || 0}`).join('\n\n')}\n\nRIEPILOGO:\n─────────────────\nTOTALE: €${totale}`
        : `PREVENTIVO\nData: ${new Date().toLocaleDateString('it-IT')}  |  Validità: 30 giorni\n\nSERVIZI:\n\nSERVIZIO: Riprese video\nDETTAGLI:\n- Mezza giornata di riprese\nPREZZO: €400\n\nSERVIZIO: Montaggio video\nDETTAGLI:\n- Montaggio con musica\nPREZZO: €300\n\nRIEPILOGO:\n─────────────────\nTOTALE: €700`
      const res = await fetch(`${backendUrl}/api/genera-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ testo: testoDemo, template: tmpl, versione_padre_id: null })
      })
      const data = await res.json()
      if (data.html) {
        const htmlScalato = data.html.replace(
          '</head>',
          `<style>
            html { width: 100%; }
            body { 
              transform-origin: top left;
              transform: scale(0.45);
              width: 222%;
            }
          </style></head>`
        )
        setHtmlPreview(htmlScalato)
      }
    } catch (e) { console.log('Preview fallita:', e) }
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

  async function completa() {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Salva profilo
      await supabase.from('profiles').update({
        nome_azienda: nomeAzienda.trim(),
        citta: citta.trim(),
        categoria,
        template_preferito: templateScelto,
      }).eq('id', user.id)

      // Salva servizi
      if (servizi.length > 0) {
        await supabase.from('servizi').insert(
          servizi.map((s, i) => ({
            user_id: user.id,
            nome: s.nome,
            descrizione: s.descrizione || null,
            costo: s.costo ? parseFloat(s.costo) : null,
            unita: s.unita,
            ordine: i
          }))
        )
      }

      router.replace('/(tabs)')
    } catch (err: any) {
      Alert.alert('Errore', err.message)
    }
    setSaving(false)
  }

  // ── STEP 0: Benvenuto ──
  if (step === 0) return (
    <View style={styles.container}>
      <View style={styles.welcomeContent}>
        <Text style={styles.welcomeEmoji}>🎉</Text>
        <Text style={styles.welcomeTitle}>Benvenuto in{'\n'}PreventivoAI</Text>
        <Text style={styles.welcomeSub}>
          In 2 minuti configuro il tuo profilo.{'\n'}
          Poi generi preventivi professionali{'\n'}
          in 30 secondi.
        </Text>
        <View style={styles.welcomeFeatures}>
          {[
            { icon: '🎙', text: 'Racconta il lavoro a voce' },
            { icon: '🤖', text: 'Claude genera il preventivo' },
            { icon: '📄', text: 'PDF professionale in 30 sec' },
          ].map((f, i) => (
            <View key={i} style={styles.welcomeFeature}>
              <Text style={styles.welcomeFeatureIcon}>{f.icon}</Text>
              <Text style={styles.welcomeFeatureText}>{f.text}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(1)}>
          <Text style={styles.nextBtnText}>Inizia la configurazione →</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  // ── STEP 1: Dati azienda ──
  if (step === 1) return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepNum}>1 di 2</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '33%' }]} />
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.stepContent}>
        <Text style={styles.stepTitle}>Chi sei?</Text>
        <Text style={styles.stepSub}>Questi dati appariranno nei tuoi preventivi PDF</Text>

        <Text style={styles.fieldLabel}>NOME O RAGIONE SOCIALE *</Text>
        <TextInput
          style={styles.fieldInput}
          value={nomeAzienda}
          onChangeText={setNomeAzienda}
          placeholder="es. Mario Rossi, Studio Rossi"
          placeholderTextColor="#9CA3AF"
          autoFocus
        />

        <Text style={styles.fieldLabel}>CITTÀ</Text>
        <TextInput
          style={styles.fieldInput}
          value={citta}
          onChangeText={setCitta}
          placeholder="es. Roma"
          placeholderTextColor="#9CA3AF"
        />

        <Text style={styles.fieldLabel}>CHE LAVORO FAI?</Text>
        <View style={styles.categorie}>
          {CATEGORIE.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.categoriaChip, categoria === c && styles.categoriaChipActive]}
              onPress={() => setCategoria(c)}
            >
              <Text style={[styles.categoriaText, categoria === c && styles.categoriaTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.nextBtn, (!nomeAzienda.trim() || !categoria) && styles.nextBtnDisabled]}
          onPress={() => setStep(2)}
          disabled={!nomeAzienda.trim() || !categoria}
        >
          <Text style={styles.nextBtnText}>Avanti →</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  )

  // ── STEP 2: Servizi ──
  if (step === 2) return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepNum}>2 di 2</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '100%' }]} />
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.stepContent}>
        <Text style={styles.stepTitle}>I tuoi servizi</Text>
        <Text style={styles.stepSub}>Claude userà questi prezzi per ogni preventivo</Text>

        <View style={styles.modalitaTabs}>
          {([['testo', '📋 Incolla'] , ['foto', '📷 Foto'], ['vocale', '🎙 Vocale'], ['manuale', '✏️ Manuale']] as const).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[styles.modalitaTab, ((key === 'manuale' && modalitaServizi === 'manuale') || (key !== 'manuale' && listinoTab === key && modalitaServizi !== 'manuale')) && styles.modalitaTabActive]}
              onPress={() => {
                if (key === 'manuale') { setModalitaServizi('manuale') }
                else { setModalitaServizi('testo'); setListinoTab(key) }
              }}
            >
              <Text style={[styles.modalitaTabText, ((key === 'manuale' && modalitaServizi === 'manuale') || (key !== 'manuale' && listinoTab === key && modalitaServizi !== 'manuale')) && styles.modalitaTabTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {modalitaServizi === 'testo' && listinoTab === 'testo' && (
          <View style={styles.testoServiziBox}>
            <Text style={styles.testoServiziHint}>
              Incolla il tuo listino prezzi — anche disordinato. Claude lo struttura automaticamente.
            </Text>
            <TextInput
              style={styles.testoServiziInput}
              value={testoServizi}
              onChangeText={setTestoServizi}
              multiline
              textAlignVertical="top"
              placeholder={categoria && ESEMPI_LISTINO[categoria] ? `es.\n${ESEMPI_LISTINO[categoria]}` : 'es.\nServizio 1: 100€\nServizio 2: 200€/ora\nServizio 3: 50€/cad'}
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity
              style={[styles.elaboraBtn, (!testoServizi.trim() || elaborando) && styles.nextBtnDisabled]}
              onPress={elaboraServiziAI}
              disabled={!testoServizi.trim() || elaborando}
            >
              {elaborando
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.elaboraBtnText}>🤖 Struttura con AI</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {modalitaServizi === 'testo' && listinoTab === 'foto' && (
          <View style={{ gap: 12, marginBottom: 80 }}>
            <Text style={styles.testoServiziHint}>Scatta o carica una foto del tuo listino — anche scritto a mano.</Text>
            <TouchableOpacity
              style={[styles.testoServiziInput, { height: 120, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed' }]}
              onPress={async () => {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
                if (status !== 'granted') { Alert.alert('Permesso negato', 'Serve accesso alla galleria.'); return }
                const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, base64: true })
                if (!result.canceled && result.assets[0].base64) {
                  setElaborandoMedia(true)
                  try {
                    const { data: { session } } = await supabase.auth.getSession()
                    if (!session) return
                    const res = await fetch(`${backendUrl}/api/elabora-servizi`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                      body: JSON.stringify({ immagine_base64: result.assets[0].base64, mime_type: result.assets[0].mimeType || 'image/jpeg' })
                    })
                    const data = await res.json()
                    if (data.servizi) { setServizi(data.servizi); setModalitaServizi('manuale') }
                    else Alert.alert('Nessun servizio trovato', 'Prova con un\'altra foto.')
                  } catch { Alert.alert('Errore', 'Impossibile elaborare la foto') }
                  setElaborandoMedia(false)
                }
              }}
            >
              {elaborandoMedia ? <ActivityIndicator color="#0E9F8E" /> : <>
                <Text style={{ fontSize: 32 }}>📷</Text>
                <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>Scegli dalla galleria</Text>
              </>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.elaboraBtn, elaborandoMedia && styles.nextBtnDisabled]}
              disabled={elaborandoMedia}
              onPress={async () => {
                const { status } = await ImagePicker.requestCameraPermissionsAsync()
                if (status !== 'granted') { Alert.alert('Permesso negato', 'Serve accesso alla fotocamera.'); return }
                const result = await ImagePicker.launchCameraAsync({ quality: 0.7, base64: true })
                if (!result.canceled && result.assets[0].base64) {
                  setElaborandoMedia(true)
                  try {
                    const { data: { session } } = await supabase.auth.getSession()
                    if (!session) return
                    const res = await fetch(`${backendUrl}/api/elabora-servizi`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                      body: JSON.stringify({ immagine_base64: result.assets[0].base64, mime_type: 'image/jpeg' })
                    })
                    const data = await res.json()
                    if (data.servizi) { setServizi(data.servizi); setModalitaServizi('manuale') }
                    else Alert.alert('Nessun servizio trovato', 'Prova con un\'altra foto.')
                  } catch { Alert.alert('Errore', 'Impossibile elaborare la foto') }
                  setElaborandoMedia(false)
                }
              }}
            >
              <Text style={styles.elaboraBtnText}>📸 Scatta una foto</Text>
            </TouchableOpacity>
          </View>
        )}

        {modalitaServizi === 'testo' && listinoTab === 'vocale' && (
          <View style={{ gap: 12, alignItems: 'center' }}>
            <Text style={styles.testoServiziHint}>Descrivi i tuoi servizi a voce — prezzi, nomi, unità. Claude trascrive e struttura tutto.</Text>
            <TouchableOpacity
              style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: registrando ? '#EF4444' : '#0D1B2A', justifyContent: 'center', alignItems: 'center', marginVertical: 8 }}
              onPress={async () => {
                if (registrando) {
                  setRegistrando(false)
                  if (!recording) return
                  await recording.stopAndUnloadAsync()
                  const uri = recording.getURI()
                  setRecording(null)
                  if (!uri) return
                  setElaborandoMedia(true)
                  try {
                    const audioData = await fetch(uri)
                    const blob = await audioData.blob()
                    const reader = new FileReader()
                    reader.onloadend = async () => {
                      const base64 = (reader.result as string).split(',')[1]
                      const { data: { session } } = await supabase.auth.getSession()
                      if (!session) return
                      const trRes = await fetch(`${backendUrl}/api/trascrivi`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                        body: JSON.stringify({ audio: base64 })
                      })
                      const trData = await trRes.json()
                      if (!trData.trascrizione) { Alert.alert('Errore', 'Trascrizione fallita'); setElaborandoMedia(false); return }
                      const elRes = await fetch(`${backendUrl}/api/elabora-servizi`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                        body: JSON.stringify({ testo: trData.trascrizione })
                      })
                      const elData = await elRes.json()
                      if (elData.servizi) { setServizi(elData.servizi); setModalitaServizi('manuale') }
                      else Alert.alert('Nessun servizio trovato', 'Riprova descrivendo meglio i servizi.')
                      setElaborandoMedia(false)
                    }
                    reader.readAsDataURL(blob)
                  } catch { Alert.alert('Errore', 'Impossibile elaborare il vocale'); setElaborandoMedia(false) }
                } else {
                  const { status } = await Audio.requestPermissionsAsync()
                  if (status !== 'granted') { Alert.alert('Permesso negato', 'Serve accesso al microfono.'); return }
                  await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true })
                  const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY)
                  setRecording(rec)
                  setRegistrando(true)
                }
              }}
            >
              {elaborandoMedia ? <ActivityIndicator color="#fff" size="large" /> : <Text style={{ fontSize: 32 }}>{registrando ? '⏹' : '🎙'}</Text>}
            </TouchableOpacity>
            <Text style={{ fontSize: 13, color: registrando ? '#EF4444' : '#9CA3AF', fontWeight: '500' }}>
              {elaborandoMedia ? 'Elaborazione...' : registrando ? 'Tocca per fermare' : 'Tocca per registrare'}
            </Text>
          </View>
        )}

        {modalitaServizi === 'manuale' && (
          <View style={styles.manualBox}>
            {servizi.map((s, i) => (
              <View key={i} style={styles.servizioItem}>
                <View style={styles.servizioItemLeft}>
                  <Text style={styles.servizioItemNome}>{s.nome}</Text>
                  {s.costo ? <Text style={styles.servizioItemCosto}>€{s.costo}/{s.unita}</Text> : null}
                </View>
                <TouchableOpacity onPress={() => rimuoviServizio(i)}>
                  <Text style={styles.servizioItemDel}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.nuovoServizioForm}>
              <TextInput
                style={styles.fieldInput}
                value={nuovoServizio.nome}
                onChangeText={v => setNuovoServizio(s => ({ ...s, nome: v }))}
                placeholder="Nome servizio *"
                placeholderTextColor="#9CA3AF"
              />
              <View style={styles.costoUnitaRow}>
                <TextInput
                  style={[styles.fieldInput, { flex: 1 }]}
                  value={nuovoServizio.costo}
                  onChangeText={v => setNuovoServizio(s => ({ ...s, costo: v }))}
                  placeholder="Costo €"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                />
                <View style={styles.unitaMiniChips}>
                  {UNITA.map(u => (
                    <TouchableOpacity
                      key={u}
                      style={[styles.unitaMiniChip, nuovoServizio.unita === u && styles.unitaMiniChipActive]}
                      onPress={() => setNuovoServizio(s => ({ ...s, unita: u }))}
                    >
                      <Text style={[styles.unitaMiniText, nuovoServizio.unita === u && styles.unitaMiniTextActive]}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <TouchableOpacity
                style={[styles.aggiungiBtn, !nuovoServizio.nome.trim() && styles.nextBtnDisabled]}
                onPress={aggiungiServizio}
                disabled={!nuovoServizio.nome.trim()}
              >
                <Text style={styles.aggiungiBtnText}>+ Aggiungi servizio</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.skipRow}>
          <TouchableOpacity
            style={styles.nextBtn}
            onPress={() => { setStep(3); aggiornaPreview(templateScelto) }}
          >
            <Text style={styles.nextBtnText}>
              {servizi.length > 0 ? `Avanti — ${servizi.length} servizi →` : 'Avanti →'}
            </Text>
          </TouchableOpacity>
          {servizi.length === 0 && (
            <Text style={styles.skipNote}>Potrai aggiungere i servizi in seguito dalle impostazioni</Text>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  )

  // ── STEP 3: Scelta template ──
  if (step === 3) return (
    <View style={styles.container}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepNum}>3 di 3</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '100%' }]} />
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 16, backgroundColor: '#F7F8FA', flexGrow: 1 }}>
        <Text style={styles.stepTitle}>Scegli il tuo stile</Text>
        <Text style={styles.stepSub}>Il template che preferisci per i tuoi preventivi PDF</Text>

        {/* Selector template */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[
            { id: 'pulito', nome: 'Pulito', emoji: '⬜' },
            { id: 'classico', nome: 'Classico', emoji: '📋' },
            { id: 'bold', nome: 'Bold', emoji: '🎨' },
            { id: 'minimal_dark', nome: 'Dark', emoji: '🌙' },
            { id: 'artigiano', nome: 'Artigiano', emoji: '🪵' },
          ].map(t => (
            <TouchableOpacity
              key={t.id}
              style={[styles.templateChip, templateScelto === t.id && styles.templateChipActive]}
              onPress={() => {
                setTemplateScelto(t.id)
                if (previewTimeout.current) clearTimeout(previewTimeout.current)
                previewTimeout.current = setTimeout(() => aggiornaPreview(t.id), 300)
              }}
            >
              <Text style={styles.templateChipEmoji}>{t.emoji}</Text>
              <Text style={[styles.templateChipText, templateScelto === t.id && styles.templateChipTextActive]}>{t.nome}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Preview */}
        <View style={styles.previewCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={styles.stepSub}>Anteprima</Text>
            {caricandoPreview && <ActivityIndicator size="small" color="#0E9F8E" />}
          </View>
          <View style={styles.previewContainer}>
            {htmlPreview ? (
              <WebView
                source={{ html: htmlPreview }}
                style={{ flex: 1 }}
                scrollEnabled={true}
                scalesPageToFit={false}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
              />
            ) : (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#0E9F8E" />
                <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 12 }}>Caricamento anteprima...</Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.nextBtn, saving && styles.nextBtnDisabled]}
          onPress={completa}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.nextBtnText}>✓ Inizia a usare PreventivoAI</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </View>
  )

  return null
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1B2A' },
  welcomeContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  welcomeEmoji: { fontSize: 64 },
  welcomeTitle: { fontSize: 34, fontWeight: '700', color: '#fff', textAlign: 'center', lineHeight: 42 },
  welcomeSub: { fontSize: 16, color: '#9EC5C0', textAlign: 'center', lineHeight: 24 },
  welcomeFeatures: { width: '100%', gap: 12, marginTop: 8 },
  welcomeFeature: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 14 },
  welcomeFeatureIcon: { fontSize: 24 },
  welcomeFeatureText: { fontSize: 15, color: '#fff', fontWeight: '500' },
  stepHeader: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 8, backgroundColor: '#0D1B2A' },
  stepNum: { fontSize: 12, color: '#9EC5C0', fontWeight: '600', marginBottom: 8, letterSpacing: 1 },
  progressBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2 },
  progressFill: { height: 4, backgroundColor: '#0E9F8E', borderRadius: 2 },
  stepContent: { padding: 24, gap: 12, backgroundColor: '#F7F8FA', flexGrow: 1 },
  stepTitle: { fontSize: 26, fontWeight: '700', color: '#0D1B2A', marginTop: 8 },
  stepSub: { fontSize: 14, color: '#6B7280', marginBottom: 8 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.8, marginTop: 4 },
  fieldInput: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 12, fontSize: 14, color: '#0D1B2A' },
  categorie: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  categoriaChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#fff' },
  categoriaChipActive: { backgroundColor: '#0D1B2A', borderColor: '#0D1B2A' },
  categoriaText: { fontSize: 13, color: '#6B7280' },
  categoriaTextActive: { color: '#fff', fontWeight: '500' },
  nextBtn: { backgroundColor: '#0E9F8E', borderRadius: 16, padding: 16, alignItems: 'center' as const, marginTop: 16 },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalitaTabs: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 3, borderWidth: 1, borderColor: '#E5E7EB', marginTop: 4 },
  modalitaTab: { flex: 1, paddingVertical: 7, paddingHorizontal: 4, borderRadius: 10, alignItems: 'center' as const },
  modalitaTabActive: { backgroundColor: '#0D1B2A' },
  modalitaTabText: { fontSize: 10, color: '#9CA3AF', fontWeight: '500' },
  modalitaTabTextActive: { color: '#fff' },
  testoServiziBox: { gap: 10 },
  testoServiziHint: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
  testoServiziInput: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 12, fontSize: 13, color: '#0D1B2A', minHeight: 160, textAlignVertical: 'top' },
  elaboraBtn: { backgroundColor: '#0D1B2A', borderRadius: 12, padding: 14, alignItems: 'center' as const },
  elaboraBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  manualBox: { gap: 10 },
  servizioItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  servizioItemLeft: { flex: 1 },
  servizioItemNome: { fontSize: 14, fontWeight: '500', color: '#0D1B2A' },
  servizioItemCosto: { fontSize: 12, color: '#0E9F8E', marginTop: 2 },
  servizioItemDel: { fontSize: 16, color: '#9CA3AF', padding: 4 },
  nuovoServizioForm: { gap: 8, backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  costoUnitaRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  unitaMiniChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, flex: 1 },
  unitaMiniChip: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F7F8FA' },
  unitaMiniChipActive: { backgroundColor: '#0D1B2A', borderColor: '#0D1B2A' },
  unitaMiniText: { fontSize: 10, color: '#6B7280' },
  unitaMiniTextActive: { color: '#fff' },
  aggiungiBtn: { backgroundColor: '#F0FDF4', borderRadius: 10, padding: 10, alignItems: 'center' as const, borderWidth: 1, borderColor: '#0E9F8E' },
  aggiungiBtnText: { color: '#0E9F8E', fontSize: 13, fontWeight: '600' },
  skipRow: { gap: 8 },
  skipNote: { fontSize: 12, color: '#9CA3AF', textAlign: 'center' as const },
  templateChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#fff' },
  templateChipActive: { backgroundColor: '#0D1B2A', borderColor: '#0D1B2A' },
  templateChipEmoji: { fontSize: 16 },
  templateChipText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  templateChipTextActive: { color: '#fff' },
  previewCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  previewContainer: { height: 400, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff' },
})
