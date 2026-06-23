import { Audio } from 'expo-av'
import Constants from 'expo-constants'
import { router } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, View } from 'react-native'
import { ServizioForm } from '../../lib/types'
import { creaServizioListino } from '../../lib/api/servizi'
import { sessionToken } from '../../lib/api/auth'
import { trackEvento } from '../../lib/api/track'
import { useAnnullaSelezioneOnAndroidBack } from '../../lib/hooks/useAnnullaSelezioneOnAndroidBack'
import { aggiornaServizioListino, caricaServiziListino, eliminaServiziListino, eliminaServizioListino, normalizzaServizioListino, parseCostoServizioManuale } from '../../lib/api/listino'
import { avviaRegistrazioneListinoSmart, elaboraListinoDaTestoSmart, fermaRegistrazioneListinoSmart, scattaFotoListinoSmart, scegliFotoListinoSmart } from '../../lib/features/listino/media'
import { ListinoEmpty } from '../../lib/components/listino/ListinoEmpty'
import { ListinoHeader } from '../../lib/components/listino/ListinoHeader'
import { ListinoSelectionBar } from '../../lib/components/listino/ListinoSelectionBar'
import { ListinoServiziList } from '../../lib/components/listino/ListinoServiziList'
import { ListinoServizioModal, ServizioDraft } from '../../lib/components/listino/ListinoServizioModal'
import { ListinoSmartModal } from '../../lib/components/listino/ListinoSmartModal'
import { useScreenTheme } from '../../lib/hooks/useScreenTheme'

const EMPTY_DRAFT: ServizioDraft = { nome: '', descrizione: '', costo: '', unita: 'cad' }

export default function Listino() {
  const { colors, s } = useScreenTheme()
  const [servizi, setServizi] = useState<ServizioForm[]>([])
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState('')
  const [mostraModalServizio, setMostraModalServizio] = useState(false)
  const [servizioInEdit, setServizioInEdit] = useState<ServizioForm | null>(null)
  const [nuovoServizio, setNuovoServizio] = useState<ServizioDraft>(EMPTY_DRAFT)
  const [salvandoServizio, setSalvandoServizio] = useState(false)
  const [mostraModalListino, setMostraModalListino] = useState(false)
  const [testoListino, setTestoListino] = useState('')
  const [elaborandoListino, setElaborandoListino] = useState(false)
  const [listinoTab, setListinoTab] = useState<'testo' | 'foto' | 'vocale'>('testo')
  const [registrando, setRegistrando] = useState(false)
  const [recording, setRecording] = useState<Audio.Recording | null>(null)
  const [selezioneAttiva, setSelezioneAttiva] = useState(false)
  const [serviziSelezionati, setServiziSelezionati] = useState<string[]>([])
  const [ricerca, setRicerca] = useState('')

  const serviziFiltrati = useMemo(() => {
    const q = ricerca.trim().toLowerCase()
    if (!q) return servizi
    return servizi.filter(s =>
      s.nome.toLowerCase().includes(q) || (s.descrizione || '').toLowerCase().includes(q),
    )
  }, [ricerca, servizi])

  const backendUrl = Constants.expoConfig?.extra?.backendUrl

  useEffect(() => {
    trackEvento('schermata_aperta', 'listino')
    carica()
    sessionToken().then(setToken)
  }, [])

  async function carica() {
    const data = await caricaServiziListino()
    if (data) setServizi(data)
    setLoading(false)
  }

  function apriNuovo() {
    setServizioInEdit(null)
    setNuovoServizio(EMPTY_DRAFT)
    setMostraModalServizio(true)
  }

  function apriModifica(s: ServizioForm) {
    setServizioInEdit(s)
    setNuovoServizio({ nome: s.nome, descrizione: s.descrizione, costo: s.costo, unita: s.unita })
    setMostraModalServizio(true)
  }

  async function duplicaServizio(s: ServizioForm) {
    const { data, error } = await creaServizioListino({
      nome: `Copia di ${s.nome}`,
      descrizione: s.descrizione,
      costo: s.costo,
      unita: s.unita,
      ordine: servizi.length,
    })
    if (error) {
      Alert.alert('Errore', error.message)
      return
    }
    if (data) {
      const copia = normalizzaServizioListino(data)
      setServizi(prev => [...prev, copia])
      apriModifica(copia)
    }
  }

  async function salvaServizio() {
    if (!nuovoServizio.nome.trim()) { Alert.alert('Errore', 'Inserisci almeno il nome del servizio'); return }
    setSalvandoServizio(true)
    const costoParsed = parseCostoServizioManuale(nuovoServizio.costo)
    const payload = {
      nome: nuovoServizio.nome.trim(),
      descrizione: nuovoServizio.descrizione.trim() || null,
      costo: costoParsed,
      unita: nuovoServizio.unita,
      ordine: servizi.length,
    }
    if (servizioInEdit) {
      const { error } = await aggiornaServizioListino(servizioInEdit.id, payload)
      if (!error) {
        setServizi(s => s.map(x => x.id === servizioInEdit.id
          ? { ...x, ...nuovoServizio, costo: costoParsed != null ? String(costoParsed) : '' }
          : x))
      }
    } else {
      const { data, error } = await creaServizioListino({ ...nuovoServizio, ordine: servizi.length })
      if (!error && data) setServizi(s => [...s, normalizzaServizioListino(data)])
    }
    setSalvandoServizio(false)
    setMostraModalServizio(false)
  }

  async function eliminaServizio(id: string) {
    Alert.alert('Elimina servizio', 'Vuoi eliminare questo servizio?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: async () => {
        await eliminaServizioListino(id)
        setServizi(s => s.filter(x => x.id !== id))
      }},
    ])
  }

  function toggleSelezione(id: string) {
    setServiziSelezionati(ids => {
      const prossimi = ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]
      if (prossimi.length === 0) setSelezioneAttiva(false)
      return prossimi
    })
  }

  function avviaSelezione(id: string) {
    setSelezioneAttiva(true)
    setServiziSelezionati(ids => ids.includes(id) ? ids : [...ids, id])
  }

  function annullaSelezione() {
    setSelezioneAttiva(false)
    setServiziSelezionati([])
  }

  useAnnullaSelezioneOnAndroidBack(selezioneAttiva, annullaSelezione)

  async function eliminaServiziSelezionati() {
    const ids = [...serviziSelezionati]
    if (ids.length === 0) return
    Alert.alert('Elimina', `Eliminare ${ids.length} servizi?`, [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: async () => {
        const { error } = await eliminaServiziListino(ids)
        if (error) { Alert.alert('Errore', error.message); return }
        setServizi(s => s.filter(x => !ids.includes(x.id)))
        annullaSelezione()
      }},
    ])
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
      if (result.empty) {
        Alert.alert('Nessun servizio trovato', sorgente === 'galleria' ? 'Prova con un\'altra foto.' : undefined)
        return
      }

      setServizi(s => [...s, ...result.inseriti])
      setMostraModalListino(false); setListinoTab('testo')
      Alert.alert('Servizi aggiunti', `${result.inseriti.length} servizi aggiunti.`)
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
        if (!inseriti.length) { Alert.alert('Nessun servizio trovato'); return }
        setServizi(s => [...s, ...inseriti])
        setMostraModalListino(false); setListinoTab('testo')
        Alert.alert('Servizi aggiunti', `${inseriti.length} servizi aggiunti.`)
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

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#0E9F8E" /></View>

  return (
    <View style={s.container}>
      <ListinoHeader
        onBack={() => router.back()}
        onOpenAi={() => setMostraModalListino(true)}
        onAdd={apriNuovo}
      />

      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        {servizi.length === 0 ? (
          <ListinoEmpty onAdd={apriNuovo} />
        ) : (
          <>
            <View style={s.searchBox}>
              <TextInput
                value={ricerca}
                onChangeText={setRicerca}
                placeholder="Cerca per nome o descrizione"
                placeholderTextColor={colors.textMuted}
                style={s.searchInput}
              />
            </View>
            <ListinoServiziList
              servizi={serviziFiltrati}
              selezioneAttiva={selezioneAttiva}
              serviziSelezionati={serviziSelezionati}
              onPress={(srv) => selezioneAttiva ? toggleSelezione(srv.id) : apriModifica(srv)}
              onLongPress={avviaSelezione}
              onToggleSelezione={toggleSelezione}
              onEdit={apriModifica}
              onDuplicate={duplicaServizio}
              onDelete={eliminaServizio}
            />
            {serviziFiltrati.length === 0 && ricerca.trim() !== '' && (
              <View style={[s.card, { padding: 20 }]}>
                <Text style={[s.textMuted, { textAlign: 'center' }]}>
                  Nessun servizio trovato.
                </Text>
              </View>
            )}
          </>
        )}
        <View style={{ height: selezioneAttiva ? 120 : 40 }} />
      </ScrollView>

      {selezioneAttiva ? (
        <ListinoSelectionBar
          count={serviziSelezionati.length}
          onCancel={annullaSelezione}
          onDelete={eliminaServiziSelezionati}
        />
      ) : null}

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
      />

      <ListinoServizioModal
        visible={mostraModalServizio}
        isEdit={!!servizioInEdit}
        draft={nuovoServizio}
        salvando={salvandoServizio}
        onClose={() => setMostraModalServizio(false)}
        onSave={salvaServizio}
        onChange={setNuovoServizio}
      />
    </View>
  )
}
