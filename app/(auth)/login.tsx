import * as LocalAuthentication from 'expo-local-authentication'
import { router } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import * as WebBrowser from 'expo-web-browser'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native'
import { currentUserId, hasCompletedProfile, resetPassword, signInWithEmail, signUpWithEmail } from '../../lib/api/auth'
import { errorMessage } from '../../lib/utils/errors'

WebBrowser.maybeCompleteAuthSession()

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mostraPassword, setMostraPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const loadingGoogle = false
  const [biometricoDisponibile, setBiometricoDisponibile] = useState(false)
  const [biometricoAttivato, setBiometricoAttivato] = useState(false)

  useEffect(() => {
    async function checkBiometrico() {
      const disponibile = await LocalAuthentication.hasHardwareAsync()
      const enrollato = await LocalAuthentication.isEnrolledAsync()
      setBiometricoDisponibile(disponibile && enrollato)
      const attivato = await SecureStore.getItemAsync('biometrico_attivato')
      if (attivato === 'true') setBiometricoAttivato(true)
    }
    checkBiometrico()
  }, [])

  async function controllaOnboarding() {
    const userId = await currentUserId()
    if (!userId) return
    const profiloCompleto = await hasCompletedProfile(userId)
    if (!profiloCompleto) {
      router.replace('/onboarding')
    } else {
      router.replace('/(tabs)')
    }
  }

  async function handleSubmit() {
    if (!email || !password) {
      Alert.alert('Errore', 'Inserisci email e password')
      return
    }
    setLoading(true)
    if (mode === 'register') {
      const { error } = await signUpWithEmail(email, password)
      if (error) Alert.alert('Errore', error.message)
      else Alert.alert('Fatto!', 'Controlla la tua email per confermare.')
    } else {
      const { error } = await signInWithEmail(email, password)
      if (error) {
        Alert.alert('Errore', 'Email o password non corretti.')
      } else {
        if (biometricoDisponibile && !biometricoAttivato) {
          Alert.alert(
            'Accesso rapido',
            'Vuoi usare l\'impronta digitale per i prossimi accessi?',
            [
              { text: 'No', onPress: () => controllaOnboarding() },
              {
                text: 'Sì', onPress: async () => {
                  await SecureStore.setItemAsync('saved_email', email)
                  await SecureStore.setItemAsync('saved_password', password)
                  await SecureStore.setItemAsync('biometrico_attivato', 'true')
                  setBiometricoAttivato(true)
                  controllaOnboarding()
                }
              }
            ]
          )
        } else {
          controllaOnboarding()
        }
      }
    }
    setLoading(false)
  }

  async function loginBiometrico() {
    setLoading(true)
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Accedi a PreventivoAI',
        cancelLabel: 'Annulla',
        fallbackLabel: 'Usa password',
      })
      if (result.success) {
        const savedEmail = await SecureStore.getItemAsync('saved_email')
        const savedPassword = await SecureStore.getItemAsync('saved_password')
        if (savedEmail && savedPassword) {
          const { error } = await signInWithEmail(savedEmail, savedPassword)
          if (error) {
            Alert.alert('Errore', 'Sessione scaduta. Accedi con email e password.')
            await SecureStore.deleteItemAsync('biometrico_attivato')
            setBiometricoAttivato(false)
          } else {
            router.replace('/(tabs)')
          }
        }
      }
    } catch (err: unknown) {
      Alert.alert('Errore', errorMessage(err))
    }
    setLoading(false)
  }

  async function handleGoogle() {
    Alert.alert(
      'Login con Google',
      'Il login con Google sarà disponibile nella versione completa dell\'app. Per ora usa email e password.',
      [{ text: 'OK' }]
    )
  }

  async function recuperaPassword() {
    if (!email.trim()) {
      Alert.alert('Email richiesta', 'Inserisci la tua email e poi riprova.')
      return
    }

    setResetLoading(true)
    const { error } = await resetPassword(email.trim())
    setResetLoading(false)

    if (error) {
      Alert.alert('Errore', error.message)
      return
    }

    Alert.alert('Email inviata', 'Controlla la tua email e segui il link per reimpostare la password.')
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>Preventivo<Text style={styles.logoAccent}>AI</Text></Text>
          <Text style={styles.subtitle}>{mode === 'login' ? 'Bentornato' : 'Crea il tuo account'}</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.toggle}>
            <TouchableOpacity style={[styles.toggleBtn, mode === 'login' && styles.toggleActive]} onPress={() => setMode('login')}>
              <Text style={[styles.toggleText, mode === 'login' && styles.toggleTextActive]}>Accedi</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toggleBtn, mode === 'register' && styles.toggleActive]} onPress={() => setMode('register')}>
              <Text style={[styles.toggleText, mode === 'register' && styles.toggleTextActive]}>Registrati</Text>
            </TouchableOpacity>
          </View>

          {biometricoAttivato && (
            <TouchableOpacity style={styles.biometricoBtn} onPress={loginBiometrico}>
              <Text style={styles.biometricoBtnIcon}>👆</Text>
              <Text style={styles.biometricoBtnText}>Accedi con impronta digitale</Text>
            </TouchableOpacity>
          )}

          <View style={styles.inputWrap}>
            <Text style={styles.label}>EMAIL</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail}
              placeholder="es. mario@gmail.com" placeholderTextColor="#9CA3AF"
              keyboardType="email-address" autoCapitalize="none" />
          </View>
          <View style={styles.inputWrap}>
            <Text style={styles.label}>PASSWORD</Text>
            <View style={styles.passwordRow}>
              <TextInput style={styles.passwordInput} value={password} onChangeText={setPassword}
                placeholder="Minimo 6 caratteri" placeholderTextColor="#9CA3AF" secureTextEntry={!mostraPassword} />
              <TouchableOpacity style={styles.passwordToggle} onPress={() => setMostraPassword(v => !v)}>
                <Text style={styles.passwordToggleText}>{mostraPassword ? 'Nascondi' : 'Mostra'}</Text>
              </TouchableOpacity>
            </View>
            {mode === 'login' && (
              <TouchableOpacity style={styles.forgotBtn} onPress={recuperaPassword} disabled={resetLoading}>
                <Text style={styles.forgotText}>{resetLoading ? 'Invio email...' : 'Password dimenticata?'}</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{mode === 'login' ? 'Accedi' : 'Crea account'}</Text>}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>oppure</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.googleBtn, loadingGoogle && styles.btnDisabled]}
            onPress={handleGoogle}
            disabled={loadingGoogle}
          >
            {loadingGoogle
              ? <ActivityIndicator color="#0D1B2A" />
              : <>
                  <Text style={styles.googleIcon}>G</Text>
                  <Text style={styles.googleText}>Continua con Google</Text>
                </>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { fontSize: 32, fontWeight: '700', color: '#0D1B2A', letterSpacing: -0.5 },
  logoAccent: { color: '#0E9F8E' },
  subtitle: { fontSize: 15, color: '#6B7280', marginTop: 6 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 24, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  toggle: { flexDirection: 'row', backgroundColor: '#F7F8FA', borderRadius: 12, padding: 4, marginBottom: 24 },
  toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' as const },
  toggleActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  toggleText: { fontSize: 14, fontWeight: '500', color: '#9CA3AF' },
  toggleTextActive: { color: '#0D1B2A' },
  inputWrap: { marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.8, marginBottom: 6 },
  input: { backgroundColor: '#F7F8FA', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 12, fontSize: 14, color: '#0D1B2A' },
  passwordRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F8FA', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB' },
  passwordInput: { flex: 1, padding: 12, fontSize: 14, color: '#0D1B2A' },
  passwordToggle: { paddingHorizontal: 12, alignSelf: 'stretch', justifyContent: 'center' },
  passwordToggleText: { fontSize: 12, color: '#0E9F8E', fontWeight: '600' },
  forgotBtn: { alignSelf: 'flex-end', marginTop: 8, paddingVertical: 4 },
  forgotText: { fontSize: 13, color: '#0E9F8E', fontWeight: '600' },
  btn: { backgroundColor: '#0D1B2A', borderRadius: 12, padding: 14, alignItems: 'center' as const, marginTop: 8 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { fontSize: 13, color: '#9CA3AF' },
  googleBtn: { flexDirection: 'row', alignItems: 'center' as const, justifyContent: 'center', backgroundColor: '#F7F8FA', borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: '#E5E7EB', gap: 10 },
  googleIcon: { fontSize: 18, fontWeight: '700', color: '#EA4335' },
  googleBtnText: { fontSize: 15, color: '#0D1B2A', fontWeight: '500' },
  googleText: { fontSize: 15, color: '#0D1B2A', fontWeight: '500' },
  biometricoBtn: { flexDirection: 'row', alignItems: 'center' as const, justifyContent: 'center', backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: '#0E9F8E', gap: 10, marginBottom: 16 },
  biometricoBtnIcon: { fontSize: 22 },
  biometricoBtnText: { fontSize: 15, color: '#0E9F8E', fontWeight: '600' as const },
})
