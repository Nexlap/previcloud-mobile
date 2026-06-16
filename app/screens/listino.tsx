import { Audio } from 'expo-av'
import Constants from 'expo-constants'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator, Alert, Modal, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View
} from 'react-native'
import { supabase } from '../../lib/supabase'
import { ServizioForm } from '../../lib/types'

export default function Listino() {
  const [servizi, setServizi] = useState<ServizioForm[]>([])
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState('')
  const [mostraModalServizio, setMostraModalServizio] = useState(false)
  const [servizioInEdit, setServizioInEdit] = useState<ServizioForm | null>(null)
  const [nuovoServizio, setNuovoServizio] = useState({ nome: '', descrizione: '', costo: '', unita: 'cad' })
  const [salvandoServizio, setSalvandoServizio] = useState(false)
  const [mostraModalListino, setMostraModalListino] = useState(false)
  const [testoListino, setTestoListino] = useState('')
  const [elaborandoListino, setElaborandoListino] = useState(false)
  const [listinoTab, setListinoTab] = useState<'testo' | 'foto' | 'vocale'>('testo')
  const [registrando, setRegistrando] = useState(false)
  const [recording, setRecording] = useState<Audio.Recording | null>(null)

  const backendUrl = Constants.expoConfig?.extra?.backendUrl
  const unitaOptions = ['cad', 'ora', 'giorno', 'mq', 'ml', 'set', 'progetto']

  useEffect(() => {
    carica()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setToken(session.access_token)
    })
  }, [])

  async function carica() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('servizi').select('*').eq('user_id', user.id).order('ordine', { ascending: true })
    if (data) setServizi(data.map(s => ({ ...s, costo: s.costo?.toString() || '', descrizione: s.descrizione || '' })))
    setLoading(false)
  }

  function apriNuovo() {
    setServizioInEdit(null)
    setNuovoServizio({ nome: '', descrizione: '', costo: '', unita: 'cad' })
    setMostraModalServizio(true)
  }

  function apriModifica(s: ServizioForm) {
    setServizioInEdit(s)
    setNuovoServizio({ nome: s.nome, descrizione: s.descrizione, costo: s.costo, unita: s.unita })
    setMostraModalServizio(true)
  }

  async function salvaServizio() {
    if (!nuovoServizio.nome.trim()) { Alert.alert('Errore', 'Inserisci almeno il nome del servizio'); return }
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
      if (!error) setServizi(s => s.map(x => x.id === servizioInEdit.id ? { ...x, ...nuovoServizio } : x))
    } else {
      const { data, error } = await supabase.from('servizi').insert(payload).select().single()
      if (!error && data) setServizi(s => [...s, { ...data, costo: data.costo?.toString() || '', descrizione: data.descrizione || '' }])
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

  async function elaboraListinoAI() {
    if (!testoListino.trim()) return
    setElaborandoListino(true)
    try {
      const res = await fetch(`${backendUrl}/api/elabora-servizi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ testo: testoListino })
      })
      const data = await res.json()
      if (!data.servizi?.length) { Alert.alert('Nessun servizio trovato', 'Prova a essere più specifico.'); setElaborandoListino(false); return }
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const nuovi = data.servizi.map((s: any, i: number) => ({
        user_id: user.id, nome: s.nome, descrizione: s.descrizione || null,
        costo: s.costo ? parseFloat(s.costo) : null, unita: s.unita || 'cad', ordine: servizi.length + i
      }))
      const { data: inseriti, error } = await supabase.from('servizi').insert(nuovi).select()
      if (error) { Alert.alert('Errore', error.message); return }
      if (inseriti) setServizi(s => [...s, ...inseriti as any[]])
      setTestoListino(''); setMostraModalListino(false)
      Alert.alert('✓ Servizi aggiunti', `${inseriti.length} servizi aggiunti al tuo listino.`)
    } catch { Alert.alert('Errore', 'Impossibile elaborare i servizi') }
    setElaborandoListino(false)
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#0E9F8E" /></View>

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>I miei servizi</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F0FDF4', borderWidth: 1.5, borderColor: '#0E9F8E', justifyContent: 'center', alignItems: 'center' }}
            onPress={() => setMostraModalListino(true)}
          >
            <Text style={{ fontSize: 16 }}>🤖</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#0E9F8E', justifyContent: 'center', alignItems: 'center' }}
            onPress={apriNuovo}
          >
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '300', lineHeight: 28 }}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        {servizi.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>📋</Text>
            <Text style={styles.emptyTitle}>Nessun servizio ancora</Text>
            <Text style={styles.emptySub}>Aggiungi i tuoi servizi con + oppure usa l'AI 🤖</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={apriNuovo}>
              <Text style={styles.emptyBtnText}>+ Aggiungi il primo servizio</Text>
            </TouchableOpacity>
          </View>
        ) : (
          servizi.map(s => (
            <View key={s.id} style={styles.servizioCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.servizioNome}>{s.nome}</Text>
                {s.descrizione ? <Text style={styles.servizioDesc}>{s.descrizione}</Text> : null}
                {s.costo ? <Text style={styles.servizioCosto}>€{s.costo} / {s.unita}</Text> : null}
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={() => apriModifica(s)} style={styles.actionBtn}>
                  <Text style={{ fontSize: 16 }}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => eliminaServizio(s.id)} style={styles.actionBtn}>
                  <Text style={{ fontSize: 16 }}>🗑</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

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

            {listinoTab === 'testo' && (
              <View style={{ gap: 8 }}>
                <TextInput
                  style={[styles.fieldInput, { height: 200, textAlignVertical: 'top' }]}
                  value={testoListino}
                  onChangeText={setTestoListino}
                  placeholder="es. Editing video: 300, Riprese mezza giornata: 400"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  autoFocus
                />
                <TouchableOpacity
                  style={[styles.saveBtn, (!testoListino.trim() || elaborandoListino) && styles.saveBtnDisabled]}
                  onPress={elaboraListinoAI}
                  disabled={!testoListino.trim() || elaborandoListino}
                >
                  {elaborandoListino ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Struttura con AI e aggiungi</Text>}
                </TouchableOpacity>
              </View>
            )}

            {listinoTab === 'foto' && (
              <View style={{ gap: 12 }}>
                <TouchableOpacity
                  style={{ backgroundColor: '#F7F8FA', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', borderStyle: 'dashed', padding: 32, alignItems: 'center', gap: 8 }}
                  onPress={async () => {
                    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
                    if (status !== 'granted') { Alert.alert('Permesso negato', 'Serve accesso alla galleria.'); return }
                    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, base64: true })
                    if (!result.canceled && result.assets[0].base64) {
                      setElaborandoListino(true)
                      try {
                        const res = await fetch(`${backendUrl}/api/elabora-servizi`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                          body: JSON.stringify({ immagine_base64: result.assets[0].base64, mime_type: result.assets[0].mimeType || 'image/jpeg' })
                        })
                        const data = await res.json()
                        if (!data.servizi?.length) { Alert.alert('Nessun servizio trovato', 'Prova con un\'altra foto.'); setElaborandoListino(false); return }
                        const { data: { user } } = await supabase.auth.getUser()
                        if (!user) return
                        const nuovi = data.servizi.map((s: any, i: number) => ({ user_id: user.id, nome: s.nome, descrizione: s.descrizione || null, costo: s.costo ? parseFloat(s.costo) : null, unita: s.unita || 'cad', ordine: servizi.length + i }))
                        const { data: inseriti } = await supabase.from('servizi').insert(nuovi).select()
                        if (inseriti) setServizi(s => [...s, ...inseriti as any[]])
                        setMostraModalListino(false); setListinoTab('testo')
                        Alert.alert('✓ Servizi aggiunti', `${inseriti?.length} servizi aggiunti.`)
                      } catch { Alert.alert('Errore', 'Impossibile elaborare la foto') }
                      setElaborandoListino(false)
                    }
                  }}
                >
                  {elaborandoListino ? <ActivityIndicator color="#0E9F8E" /> : <>
                    <Text style={{ fontSize: 36 }}>📷</Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#0D1B2A' }}>Scegli dalla galleria</Text>
                  </>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ backgroundColor: '#F7F8FA', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 16, alignItems: 'center', gap: 6 }}
                  disabled={elaborandoListino}
                  onPress={async () => {
                    const { status } = await ImagePicker.requestCameraPermissionsAsync()
                    if (status !== 'granted') { Alert.alert('Permesso negato', 'Serve accesso alla fotocamera.'); return }
                    const result = await ImagePicker.launchCameraAsync({ quality: 0.7, base64: true })
                    if (!result.canceled && result.assets[0].base64) {
                      setElaborandoListino(true)
                      try {
                        const res = await fetch(`${backendUrl}/api/elabora-servizi`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                          body: JSON.stringify({ immagine_base64: result.assets[0].base64, mime_type: 'image/jpeg' })
                        })
                        const data = await res.json()
                        if (!data.servizi?.length) { Alert.alert('Nessun servizio trovato'); setElaborandoListino(false); return }
                        const { data: { user } } = await supabase.auth.getUser()
                        if (!user) return
                        const nuovi = data.servizi.map((s: any, i: number) => ({ user_id: user.id, nome: s.nome, descrizione: s.descrizione || null, costo: s.costo ? parseFloat(s.costo) : null, unita: s.unita || 'cad', ordine: servizi.length + i }))
                        const { data: inseriti } = await supabase.from('servizi').insert(nuovi).select()
                        if (inseriti) setServizi(s => [...s, ...inseriti as any[]])
                        setMostraModalListino(false); setListinoTab('testo')
                        Alert.alert('✓ Servizi aggiunti', `${inseriti?.length} servizi aggiunti.`)
                      } catch { Alert.alert('Errore', 'Impossibile elaborare la foto') }
                      setElaborandoListino(false)
                    }
                  }}
                >
                  <Text style={{ fontSize: 36 }}>📸</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#0D1B2A' }}>Scatta una foto</Text>
                </TouchableOpacity>
              </View>
            )}

            {listinoTab === 'vocale' && (
              <View style={{ gap: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: '#6B7280', lineHeight: 18, textAlign: 'center' }}>
                  Descrivi i tuoi servizi a voce — Claude trascrive e struttura tutto.
                </Text>
                <TouchableOpacity
                  style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: registrando ? '#EF4444' : '#0D1B2A', justifyContent: 'center', alignItems: 'center', marginVertical: 8 }}
                  onPress={async () => {
                    if (registrando) {
                      setRegistrando(false)
                      if (!recording) return
                      await recording.stopAndUnloadAsync()
                      const uri = recording.getURI()
                      setRecording(null)
                      if (!uri) return
                      setElaborandoListino(true)
                      try {
                        const audioData = await fetch(uri)
                        const blob = await audioData.blob()
                        const reader = new FileReader()
                        reader.onloadend = async () => {
                          const base64 = (reader.result as string).split(',')[1]
                          const trRes = await fetch(`${backendUrl}/api/trascrivi`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ audio: base64 }) })
                          const trData = await trRes.json()
                          if (!trData.trascrizione) { Alert.alert('Errore', 'Trascrizione fallita'); setElaborandoListino(false); return }
                          const elRes = await fetch(`${backendUrl}/api/elabora-servizi`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ testo: trData.trascrizione }) })
                          const elData = await elRes.json()
                          if (!elData.servizi?.length) { Alert.alert('Nessun servizio trovato'); setElaborandoListino(false); return }
                          const { data: { user } } = await supabase.auth.getUser()
                          if (!user) return
                          const nuovi = elData.servizi.map((s: any, i: number) => ({ user_id: user.id, nome: s.nome, descrizione: s.descrizione || null, costo: s.costo ? parseFloat(s.costo) : null, unita: s.unita || 'cad', ordine: servizi.length + i }))
                          const { data: inseriti } = await supabase.from('servizi').insert(nuovi).select()
                          if (inseriti) setServizi(s => [...s, ...inseriti as any[]])
                          setMostraModalListino(false); setListinoTab('testo')
                          Alert.alert('✓ Servizi aggiunti', `${inseriti?.length} servizi aggiunti.`)
                          setElaborandoListino(false)
                        }
                        reader.readAsDataURL(blob)
                      } catch { Alert.alert('Errore', 'Impossibile elaborare il vocale'); setElaborandoListino(false) }
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
                  {elaborandoListino ? <ActivityIndicator color="#fff" size="large" /> : <Text style={{ fontSize: 36 }}>{registrando ? '⏹' : '🎙'}</Text>}
                </TouchableOpacity>
                <Text style={{ fontSize: 13, color: registrando ? '#EF4444' : '#9CA3AF', fontWeight: '500' }}>
                  {elaborandoListino ? 'Elaborazione...' : registrando ? 'Tocca per fermare' : 'Tocca per registrare'}
                </Text>
              </View>
            )}

            <TouchableOpacity style={{ alignItems: 'center', padding: 8 }} onPress={() => { setMostraModalListino(false); setListinoTab('testo') }}>
              <Text style={{ fontSize: 13, color: '#9CA3AF' }}>Annulla</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal aggiungi/modifica servizio */}
      <Modal visible={mostraModalServizio} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setMostraModalServizio(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{servizioInEdit ? 'Modifica servizio' : 'Nuovo servizio'}</Text>
            <TouchableOpacity onPress={salvaServizio} disabled={salvandoServizio}>
              {salvandoServizio ? <ActivityIndicator color="#0E9F8E" size="small" /> : <Text style={styles.modalSave}>Salva</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
            <View style={{ gap: 6 }}>
              <Text style={styles.fieldLabel}>NOME SERVIZIO *</Text>
              <TextInput style={styles.fieldInput} value={nuovoServizio.nome} onChangeText={v => setNuovoServizio(s => ({ ...s, nome: v }))} placeholder="es. Editing video" placeholderTextColor="#9CA3AF" autoFocus />
            </View>
            <View style={{ gap: 6 }}>
              <Text style={styles.fieldLabel}>DESCRIZIONE</Text>
              <TextInput style={[styles.fieldInput, { height: 80, textAlignVertical: 'top' }]} value={nuovoServizio.descrizione} onChangeText={v => setNuovoServizio(s => ({ ...s, descrizione: v }))} placeholder="es. Montaggio con musica e sottotitoli" placeholderTextColor="#9CA3AF" multiline />
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.fieldLabel}>COSTO (€)</Text>
                <TextInput style={styles.fieldInput} value={nuovoServizio.costo} onChangeText={v => setNuovoServizio(s => ({ ...s, costo: v }))} placeholder="es. 500" placeholderTextColor="#9CA3AF" keyboardType="decimal-pad" />
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.fieldLabel}>UNITÀ</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {unitaOptions.map(u => (
                    <TouchableOpacity key={u} style={[styles.unitaChip, nuovoServizio.unita === u && styles.unitaChipActive]} onPress={() => setNuovoServizio(s => ({ ...s, unita: u }))}>
                      <Text style={[styles.unitaChipText, nuovoServizio.unita === u && styles.unitaChipTextActive]}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
            {nuovoServizio.nome ? (
              <View style={{ backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#0E9F8E', gap: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: '#0E9F8E', letterSpacing: 0.8 }}>ANTEPRIMA</Text>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#0D1B2A' }}>{nuovoServizio.nome}</Text>
                {nuovoServizio.descrizione ? <Text style={{ fontSize: 12, color: '#6B7280' }}>{nuovoServizio.descrizione}</Text> : null}
                {nuovoServizio.costo ? <Text style={{ fontSize: 14, fontWeight: '700', color: '#0E9F8E', marginTop: 4 }}>€{nuovoServizio.costo} / {nuovoServizio.unita}</Text> : null}
              </View>
            ) : null}
          </ScrollView>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#0D1B2A', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { padding: 4, width: 50 },
  backText: { color: '#9CA3AF', fontSize: 22 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#0D1B2A' },
  emptySub: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
  emptyBtn: { backgroundColor: '#0E9F8E', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, marginTop: 8 },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  servizioCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center', gap: 12 },
  servizioNome: { fontSize: 14, fontWeight: '600', color: '#0D1B2A' },
  servizioDesc: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  servizioCosto: { fontSize: 13, fontWeight: '600', color: '#0E9F8E', marginTop: 4 },
  actionBtn: { padding: 6 },
  saveBtn: { backgroundColor: '#0D1B2A', borderRadius: 14, padding: 16, alignItems: 'center' as const },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  modalContainer: { flex: 1, backgroundColor: '#F7F8FA' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56, backgroundColor: '#0D1B2A' },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalClose: { color: '#9CA3AF', fontSize: 20, width: 40 },
  modalSave: { color: '#0E9F8E', fontSize: 15, fontWeight: '600' as const, width: 40, textAlign: 'right' as const },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.8 },
  fieldInput: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 12, fontSize: 14, color: '#0D1B2A' },
  unitaChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F7F8FA' },
  unitaChipActive: { backgroundColor: '#0D1B2A', borderColor: '#0D1B2A' },
  unitaChipText: { fontSize: 11, color: '#6B7280' },
  unitaChipTextActive: { color: '#fff', fontWeight: '500' },
})
