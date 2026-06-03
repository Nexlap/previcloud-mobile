import { useState, useRef } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Platform
} from 'react-native'
import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system'
import { router } from 'expo-router'
import { supabase } from '../../lib/supabase'
import Constants from 'expo-constants'

type Fase = 'idle' | 'recording' | 'processing' | 'done'

export default function Registra() {
  const [fase, setFase] = useState<Fase>('idle')
  const [secondi, setSecondi] = useState(0)
  const [trascrizione, setTrascrizione] = useState('')
  const [trascrizioneId, setTrascrizioneId] = useState('')
  const [token, setToken] = useState('')
  const recordingRef = useRef<Audio.Recording | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const backendUrl = Constants.expoConfig?.extra?.backendUrl

  async function iniziaRegistrazione() {
    try {
      const { status } = await Audio.requestPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permesso negato', 'Serve il permesso al microfono per registrare.')
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

      const { data: { session } } = await supabase.auth.getSession()
      if (session) setToken(session.access_token)

      setFase('recording')
      setSecondi(0)
      timerRef.current = setInterval(() => setSecondi(s => s + 1), 1000)

    } catch (err: any) {
      Alert.alert('Errore', err.message)
    }
  }

  async function fermaRegistrazione() {
    if (!recordingRef.current) return

    if (timerRef.current) clearInterval(timerRef.current)
    setFase('processing')

    try {
      await recordingRef.current.stopAndUnloadAsync()
      const uri = recordingRef.current.getURI()
      recordingRef.current = null

      if (!uri) throw new Error('File audio non trovato')

      // Leggi il file audio
      const audioInfo = await FileSystem.getInfoAsync(uri)
      if (!audioInfo.exists) throw new Error('File audio non esiste')

      const audioBlob = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64' as any
      })

      // Invia al backend per trascrizione
      const response = await fetch(`${backendUrl}/api/trascrivi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'audio/m4a',
          'Authorization': `Bearer ${token}`,
          'X-Audio-Base64': 'true',
        },
        body: JSON.stringify({ audio: audioBlob, durata: secondi })
      })

      const data = await response.json()
      if (data.error) throw new Error(data.error)

      setTrascrizione(data.trascrizione)
      setTrascrizioneId(data.id)
      setFase('done')

    } catch (err: any) {
      Alert.alert('Errore trascrizione', err.message)
      setFase('idle')
    }
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  function nuovaRegistrazione() {
    setFase('idle')
    setSecondi(0)
    setTrascrizione('')
    setTrascrizioneId('')
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Registra chiamata</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {fase === 'idle' && (
          <View style={styles.center}>
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>Come funziona</Text>
              <Text style={styles.infoText}>1. Metti il cliente in vivavoce</Text>
              <Text style={styles.infoText}>2. Tocca "Inizia registrazione"</Text>
              <Text style={styles.infoText}>3. Parla normalmente con il cliente</Text>
              <Text style={styles.infoText}>4. Tocca "Stop" quando hai finito</Text>
              <Text style={styles.infoText}>5. L'AI trascrive e genera il preventivo</Text>
            </View>
            <TouchableOpacity style={styles.recordBtn} onPress={iniziaRegistrazione}>
              <View style={styles.recordBtnInner}>
                <Text style={styles.recordIcon}>🎙</Text>
              </View>
              <Text style={styles.recordBtnText}>Inizia registrazione</Text>
            </TouchableOpacity>
          </View>
        )}

        {fase === 'recording' && (
          <View style={styles.center}>
            <View style={styles.recordingIndicator}>
              <View style={styles.pulseDot} />
              <Text style={styles.recordingText}>Registrazione in corso</Text>
              <Text style={styles.timer}>{formatTime(secondi)}</Text>
            </View>
            <Text style={styles.recordingHint}>Il microfono sta captando l'audio</Text>
            <TouchableOpacity style={styles.stopBtn} onPress={fermaRegistrazione}>
              <View style={styles.stopBtnInner}>
                <View style={styles.stopIcon} />
              </View>
              <Text style={styles.stopBtnText}>Stop e trascrivi</Text>
            </TouchableOpacity>
          </View>
        )}

        {fase === 'processing' && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#0E9F8E" />
            <Text style={styles.processingText}>Trascrizione in corso...</Text>
            <Text style={styles.processingHint}>Whisper AI sta elaborando l'audio</Text>
          </View>
        )}

        {fase === 'done' && (
          <View style={styles.doneContainer}>
            <View style={styles.trascrizioneCard}>
              <View style={styles.trascrizioneHeader}>
                <Text style={styles.trascrizioneTitle}>✓ Trascrizione completata</Text>
                <Text style={styles.trascrizioneSub}>Durata: {formatTime(secondi)}</Text>
              </View>
              <ScrollView style={styles.trascrizioneBody} nestedScrollEnabled>
                <Text style={styles.trascrizioneText}>{trascrizione}</Text>
              </ScrollView>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.actionPrimary}
                onPress={() => router.push({
                  pathname: '/(tabs)/nuovo',
                  params: { trascrizione, trascrizioneId }
                })}
              >
                <Text style={styles.actionPrimaryText}>Genera preventivo →</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionSecondary}
                onPress={() => {
                  Alert.alert('Salvato', 'La trascrizione è stata salvata. Potrai riprenderla dallo storico chiamate.')
                  nuovaRegistrazione()
                }}
              >
                <Text style={styles.actionSecondaryText}>Salva e richiama dopo</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionGhost} onPress={nuovaRegistrazione}>
                <Text style={styles.actionGhostText}>Nuova registrazione</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

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
  scroll: { flex: 1 },
  content: { flexGrow: 1, padding: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  infoBox: { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '100%', marginBottom: 40, borderWidth: 1, borderColor: '#E5E7EB' },
  infoTitle: { fontSize: 15, fontWeight: '600', color: '#0D1B2A', marginBottom: 12 },
  infoText: { fontSize: 14, color: '#6B7280', marginBottom: 6, lineHeight: 20 },
  recordBtn: { alignItems: 'center', gap: 12 },
  recordBtnInner: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#0E9F8E', justifyContent: 'center', alignItems: 'center', shadowColor: '#0E9F8E', shadowOpacity: 0.4, shadowRadius: 20, elevation: 8 },
  recordIcon: { fontSize: 40 },
  recordBtnText: { fontSize: 16, fontWeight: '600', color: '#0D1B2A' },
  recordingIndicator: { alignItems: 'center', marginBottom: 20 },
  pulseDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#EF4444', marginBottom: 12 },
  recordingText: { fontSize: 18, fontWeight: '600', color: '#0D1B2A', marginBottom: 8 },
  timer: { fontSize: 48, fontWeight: '700', color: '#0D1B2A', fontVariant: ['tabular-nums'] },
  recordingHint: { fontSize: 13, color: '#9CA3AF', marginBottom: 48 },
  stopBtn: { alignItems: 'center', gap: 12 },
  stopBtnInner: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', shadowColor: '#EF4444', shadowOpacity: 0.4, shadowRadius: 16, elevation: 6 },
  stopIcon: { width: 28, height: 28, backgroundColor: '#fff', borderRadius: 4 },
  stopBtnText: { fontSize: 16, fontWeight: '600', color: '#0D1B2A' },
  processingText: { fontSize: 18, fontWeight: '600', color: '#0D1B2A', marginTop: 20 },
  processingHint: { fontSize: 13, color: '#9CA3AF', marginTop: 8 },
  doneContainer: { flex: 1 },
  trascrizioneCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1.5, borderColor: '#0E9F8E', overflow: 'hidden', marginBottom: 16, maxHeight: 320 },
  trascrizioneHeader: { backgroundColor: '#0D1B2A', padding: 14 },
  trascrizioneTitle: { color: '#fff', fontSize: 14, fontWeight: '600' },
  trascrizioneSub: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  trascrizioneBody: { padding: 16 },
  trascrizioneText: { fontSize: 14, lineHeight: 22, color: '#374151' },
  actions: { gap: 10 },
  actionPrimary: { backgroundColor: '#0D1B2A', borderRadius: 14, padding: 16, alignItems: 'center' },
  actionPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  actionSecondary: { backgroundColor: '#0E9F8E', borderRadius: 14, padding: 16, alignItems: 'center' },
  actionSecondaryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  actionGhost: { borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB' },
  actionGhostText: { color: '#6B7280', fontSize: 14, fontWeight: '500' },
})