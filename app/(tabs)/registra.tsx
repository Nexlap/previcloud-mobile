import { Audio } from 'expo-av'
import Constants from 'expo-constants'
import * as FileSystem from 'expo-file-system/legacy'
import { router } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View
} from 'react-native'
import { supabase } from '../../lib/supabase'

export default function NuovoPreventivVocale() {
  const [fase, setFase] = useState<'intro' | 'input'>('intro')
  const [testo, setTesto] = useState('')
  const [registrando, setRegistrando] = useState(false)
  const [trascrivendo, setTrascrivendo] = useState(false)
  const [token, setToken] = useState('')
  const recordingRef = useRef<Audio.Recording | null>(null)
  const backendUrl = Constants.expoConfig?.extra?.backendUrl

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setToken(session.access_token)
    })
  }, [])

  async function avviaRegistrazione() {
    try {
      const { status } = await Audio.requestPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permesso negato', 'Serve accesso al microfono.')
        return
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      })
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      )
      recordingRef.current = recording
      setRegistrando(true)
    } catch (err) {
      Alert.alert('Errore', 'Impossibile avviare la registrazione')
    }
  }

  async function fermaRegistrazione() {
    if (!recordingRef.current) return
    setRegistrando(false)
    setTrascrivendo(true)
    try {
      await recordingRef.current.stopAndUnloadAsync()
      const uri = recordingRef.current.getURI()
      recordingRef.current = null

      if (!uri) throw new Error('File audio non trovato')

      const audioBase64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64' as any
      })

      const res = await fetch(`${backendUrl}/api/trascrivi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ audio: audioBase64, durata: 0 })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      if (data.trascrizione) {
        setTesto(t => t ? `${t}\n${data.trascrizione}` : data.trascrizione)
      }
    } catch (err: any) {
      Alert.alert('Errore trascrizione', err.message)
    }
    setTrascrivendo(false)
  }

  function generaPreventivo() {
    if (!testo.trim()) {
      Alert.alert('Testo vuoto', 'Scrivi o registra qualcosa prima di generare il preventivo.')
      return
    }
    router.push({
      pathname: '/(tabs)/nuovo',
      params: { trascrizione: testo.trim() }
    })
  }

  if (fase === 'intro') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nuovo preventivo vocale</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView contentContainerStyle={styles.introContent}>
          <Text style={styles.introEmoji}>🎙</Text>
          <Text style={styles.introTitle}>Racconta il lavoro</Text>
          <Text style={styles.introSub}>
            Descrivi a Claude il lavoro da fare — scrivi o parla.{'\n'}
            In pochi secondi hai il preventivo pronto.
          </Text>

          <View style={styles.introCard}>
            <Text style={styles.introCardTitle}>📝 Scrivi</Text>
            <Text style={styles.introCardText}>
              "Mario vuole rifare il bagno completo, budget massimo 3000€, vuole iniziare a settembre, includi piastrelle e sanitari"
            </Text>
          </View>

          <View style={styles.introCard}>
            <Text style={styles.introCardTitle}>🎙 Parla</Text>
            <Text style={styles.introCardText}>
              Tocca il microfono, racconta il lavoro come lo racconteresti a un collega, poi tocca Stop. Claude trascrive e genera il preventivo.
            </Text>
          </View>

          <TouchableOpacity style={styles.iniziaBtn} onPress={() => setFase('input')}>
            <Text style={styles.iniziaBtnText}>Inizia</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setFase('intro')} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nuovo preventivo vocale</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16, gap: 16 }}>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Descrivi il lavoro</Text>
          <Text style={styles.cardSub}>Scrivi oppure usa il microfono</Text>
          <TextInput
            style={styles.editor}
            value={testo}
            onChangeText={setTesto}
            multiline
            textAlignVertical="top"
            placeholder="es. Mario vuole rifare il bagno, budget 3000€, vuole iniziare a settembre..."
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Bottone microfono */}
        <View style={styles.micRow}>
          {trascrivendo ? (
            <View style={styles.trascrivendoBox}>
              <ActivityIndicator color="#0E9F8E" />
              <Text style={styles.trascrivendoText}>Trascrivo...</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.micBtn, registrando && styles.micBtnActive]}
              onPress={registrando ? fermaRegistrazione : avviaRegistrazione}
            >
              <Text style={styles.micBtnEmoji}>{registrando ? '⏹' : '🎙'}</Text>
              <Text style={styles.micBtnText}>
                {registrando ? 'Stop registrazione' : 'Avvia registrazione'}
              </Text>
              {registrando && <View style={styles.recDot} />}
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.generateBtn, !testo.trim() && styles.generateBtnDisabled]}
          onPress={generaPreventivo}
          disabled={!testo.trim()}
        >
          <Text style={styles.generateBtnText}>✨ Genera preventivo</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  header: { backgroundColor: '#0D1B2A', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { padding: 4, width: 50 },
  backText: { color: '#9CA3AF', fontSize: 22 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  introContent: { padding: 24, alignItems: 'center', gap: 20 },
  introEmoji: { fontSize: 64, marginTop: 20 },
  introTitle: { fontSize: 26, fontWeight: '700', color: '#0D1B2A', textAlign: 'center' },
  introSub: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
  introCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, width: '100%', borderWidth: 1, borderColor: '#E5E7EB', gap: 8 },
  introCardTitle: { fontSize: 15, fontWeight: '600', color: '#0D1B2A' },
  introCardText: { fontSize: 13, color: '#6B7280', lineHeight: 20, fontStyle: 'italic' },
  iniziaBtn: { backgroundColor: '#0D1B2A', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 48, marginTop: 8 },
  iniziaBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  scroll: { flex: 1 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#0D1B2A', marginBottom: 4 },
  cardSub: { fontSize: 12, color: '#9CA3AF', marginBottom: 12 },
  editor: { backgroundColor: '#F7F8FA', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 12, fontSize: 13, color: '#0D1B2A', minHeight: 160, lineHeight: 20 },
  micRow: { alignItems: 'center' },
  micBtn: { backgroundColor: '#0D1B2A', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 28, flexDirection: 'row', alignItems: 'center', gap: 10 },
  micBtnActive: { backgroundColor: '#DC2626' },
  micBtnEmoji: { fontSize: 20 },
  micBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  trascrivendoBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  trascrivendoText: { fontSize: 14, color: '#0E9F8E', fontWeight: '500' },
  generateBtn: { backgroundColor: '#0E9F8E', borderRadius: 14, padding: 16, alignItems: 'center' },
  generateBtnDisabled: { opacity: 0.4 },
  generateBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
})