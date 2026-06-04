import { Audio } from 'expo-av'
import Constants from 'expo-constants'
import * as FileSystem from 'expo-file-system/legacy'
import { router } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator, Alert, Animated, StyleSheet,
  Text, TouchableOpacity, View
} from 'react-native'
import { supabase } from '../../lib/supabase'

export default function RegistraVoce() {
  const [registrando, setRegistrando] = useState(false)
  const [trascrivendo, setTrascrivendo] = useState(false)
  const [token, setToken] = useState('')
  const recordingRef = useRef<Audio.Recording | null>(null)
  const pulseAnim = useRef(new Animated.Value(1)).current
  const backendUrl = Constants.expoConfig?.extra?.backendUrl

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setToken(session.access_token)
    })
  }, [])

  useEffect(() => {
    if (registrando) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      ).start()
    } else {
      pulseAnim.stopAnimation()
      pulseAnim.setValue(1)
    }
  }, [registrando])

  async function toggleRegistrazione() {
    if (registrando) {
      await fermaRegistrazione()
    } else {
      await avviaRegistrazione()
    }
  }

  async function avviaRegistrazione() {
    try {
      const { status } = await Audio.requestPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permesso negato', 'Serve accesso al microfono.')
        return
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true })
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
      console.log('URI:', uri)
      recordingRef.current = null
      if (!uri) throw new Error('File audio non trovato')

      const audioBase64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' as any })
      console.log('Base64 length:', audioBase64.length)

      const res = await fetch(`${backendUrl}/api/trascrivi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ audio: audioBase64, durata: 0 })
      })

      const text = await res.text()
      console.log('Risposta raw:', text)
      const data = JSON.parse(text)

      if (data.error) throw new Error(data.error)
        console.log('Trascrizione ricevuta:', data.trascrizione)
      if (data.trascrizione) {
        router.push({
          pathname: '/(tabs)/nuovo',
          params: { trascrizione: data.trascrizione.trim() }
        })
      }
    } catch (err: any) {
      Alert.alert('Errore trascrizione', err.message)
    }
    setTrascrivendo(false)
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Registra voce</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.body}>
        <View style={styles.statoBox}>
          {trascrivendo ? (
            <>
              <ActivityIndicator color="#0E9F8E" size="large" />
              <Text style={styles.statoTesto}>Trascrivo e genero...</Text>
            </>
          ) : registrando ? (
            <>
              <View style={styles.recIndicator}>
                <View style={styles.recDot} />
                <Text style={styles.recTesto}>Registrazione in corso</Text>
              </View>
              <Text style={styles.statoSub}>Tocca il bottone per fermare</Text>
            </>
          ) : (
            <>
              <Text style={styles.statoTesto}>Pronto a registrare</Text>
              <Text style={styles.statoSub}>Tocca il bottone e racconta il lavoro</Text>
            </>
          )}
        </View>

        {!trascrivendo && (
          <TouchableOpacity onPress={toggleRegistrazione} activeOpacity={0.85}>
            <Animated.View style={[
              styles.micOuter,
              registrando && styles.micOuterActive,
              { transform: [{ scale: pulseAnim }] }
            ]}>
              <View style={[styles.micInner, registrando && styles.micInnerActive]}>
                <Text style={styles.micEmoji}>{registrando ? '⏹' : '🎙'}</Text>
              </View>
            </Animated.View>
          </TouchableOpacity>
        )}

        {!registrando && !trascrivendo && (
          <View style={styles.suggerimentoBox}>
            <Text style={styles.suggerimentoTitolo}>💡 Come funziona</Text>
            <Text style={styles.suggerimentoTesto}>
              Tocca il bottone e racconta il lavoro come lo diresti a un collega. Quando hai finito tocca di nuovo — Claude trascrive e genera il preventivo automaticamente.
            </Text>
            <Text style={styles.suggerimentoEsempio}>
              "Devo fare un video corporate per una startup, mezza giornata di riprese, montaggio 3 minuti con musica e sottotitoli"
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1B2A' },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { padding: 4, width: 50 },
  backText: { color: '#9CA3AF', fontSize: 22 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 48 },
  statoBox: { alignItems: 'center', gap: 10, minHeight: 60 },
  statoTesto: { fontSize: 18, fontWeight: '600', color: '#fff', textAlign: 'center' },
  statoSub: { fontSize: 14, color: '#9EC5C0', textAlign: 'center' },
  recIndicator: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' },
  recTesto: { fontSize: 16, fontWeight: '600', color: '#EF4444' },
  micOuter: { width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(14,159,142,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(14,159,142,0.3)' },
  micOuterActive: { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.3)' },
  micInner: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#0E9F8E', justifyContent: 'center', alignItems: 'center' },
  micInnerActive: { backgroundColor: '#EF4444' },
  micEmoji: { fontSize: 48 },
  suggerimentoBox: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 18, gap: 8, width: '100%' },
  suggerimentoTitolo: { fontSize: 13, fontWeight: '600', color: '#0E9F8E' },
  suggerimentoTesto: { fontSize: 13, color: '#9EC5C0', lineHeight: 20 },
  suggerimentoEsempio: { fontSize: 12, color: '#6B7280', lineHeight: 18, fontStyle: 'italic', marginTop: 4 },
})