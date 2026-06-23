import * as LocalAuthentication from 'expo-local-authentication'
import { router } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import * as WebBrowser from 'expo-web-browser'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native'
import { currentUserId, resetPassword, resolvePostAuthRoute, signInWithEmail, signUpWithEmail } from '../../lib/api/auth'
import { supabase } from '../../lib/supabase'
import { WEB_BASE_URL, WEB_TERMINI_URL } from '../../lib/features/profilo/constants'
import { errorMessage } from '../../lib/utils/errors'

/** Imposta `true` per riattivare tab e form di registrazione in-app. */
const BETA_REGISTRAZIONE_APERTA = false

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mostraPassword, setMostraPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [biometricoDisponibile, setBiometricoDisponibile] = useState(false)
  const [biometricoAttivato, setBiometricoAttivato] = useState(false)
  const [accettaTermini, setAccettaTermini] = useState(false)
  const [errorePassword, setErrorePassword] = useState<string | null>(null)

  useEffect(() => {
    async function checkBiometrico() {
      const disponibile = await LocalAuthentication.hasHardwareAsync()
      const enrollato = await LocalAuthentication.isEnrolledAsync()
      setBiometricoDisponibile(disponibile && enrollato)
      const attivato =
        (await SecureStore.getItemAsync('biometria_attiva')) ??
        (await SecureStore.getItemAsync('biometrico_attivato'))
      if (attivato === 'true') setBiometricoAttivato(true)
    }
    checkBiometrico()
  }, [])

  async function redirectAfterSignIn(userIdFromSignIn?: string | null) {
    const userId = userIdFromSignIn ?? await currentUserId()
    if (!userId) return
    router.replace(await resolvePostAuthRoute(userId))
  }

  async function handleSubmit() {
    if (!email || !password) {
      Alert.alert('Errore', 'Inserisci email e password')
      return
    }
    if (mode === 'register' && BETA_REGISTRAZIONE_APERTA && !accettaTermini) {
      Alert.alert('Termini richiesti', 'Accetta i termini e condizioni per continuare.')
      return
    }
    if (mode === 'register' && BETA_REGISTRAZIONE_APERTA && password.length < 6) {
      setErrorePassword('La password deve avere almeno 6 caratteri.')
      return
    }
    setErrorePassword(null)
    setLoading(true)
    if (mode === 'register' && BETA_REGISTRAZIONE_APERTA) {
      const { error } = await signUpWithEmail(email, password)
      if (error) Alert.alert('Errore', error.message)
      else Alert.alert('Fatto!', 'Controlla la tua email per confermare.')
    } else {
      const { data, error } = await signInWithEmail(email, password)
      if (error) {
        Alert.alert('Errore', 'Email o password non corretti.')
      } else {
        const userId = data.user?.id
        if (biometricoDisponibile && !biometricoAttivato) {
          Alert.alert(
            'Accesso rapido',
            'Vuoi usare l\'impronta digitale per i prossimi accessi?',
            [
              { text: 'No', onPress: () => redirectAfterSignIn(userId) },
              {
                text: 'Sì', onPress: async () => {
                  await SecureStore.setItemAsync('biometria_attiva', 'true')
                  await SecureStore.deleteItemAsync('biometrico_attivato')
                  await SecureStore.deleteItemAsync('saved_email')
                  await SecureStore.deleteItemAsync('saved_password')
                  setBiometricoAttivato(true)
                  redirectAfterSignIn(userId)
                }
              }
            ]
          )
        } else {
          redirectAfterSignIn(userId)
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
        const { data, error } = await supabase.auth.refreshSession()
        if (error || !data.session) {
          Alert.alert('Errore', 'Sessione scaduta. Accedi con email e password.')
          await SecureStore.deleteItemAsync('biometria_attiva')
          await SecureStore.deleteItemAsync('biometrico_attivato')
          setBiometricoAttivato(false)
        } else {
          await redirectAfterSignIn(data.session.user?.id)
        }
      }
    } catch (err: unknown) {
      Alert.alert('Errore', errorMessage(err))
    }
    setLoading(false)
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

  async function apriTerminiWeb() {
    await WebBrowser.openBrowserAsync(WEB_TERMINI_URL)
  }

  async function apriHomepageWeb() {
    await WebBrowser.openBrowserAsync(WEB_BASE_URL)
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>Preventivo<Text style={styles.logoAccent}>AI</Text></Text>
          <Text style={styles.subtitle}>
            {mode === 'register' && BETA_REGISTRAZIONE_APERTA ? 'Crea il tuo account' : 'Bentornato'}
          </Text>
        </View>
        <View style={styles.card}>
          {BETA_REGISTRAZIONE_APERTA ? (
            <View style={styles.toggle}>
              <TouchableOpacity style={[styles.toggleBtn, mode === 'login' && styles.toggleActive]} onPress={() => { setMode('login'); setAccettaTermini(false); setErrorePassword(null) }}>
                <Text style={[styles.toggleText, mode === 'login' && styles.toggleTextActive]}>Accedi</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.toggleBtn, mode === 'register' && styles.toggleActive]} onPress={() => { setMode('register'); setErrorePassword(null) }}>
                <Text style={[styles.toggleText, mode === 'register' && styles.toggleTextActive]}>Registrati</Text>
              </TouchableOpacity>
            </View>
          ) : null}

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
              <TextInput style={styles.passwordInput} value={password} onChangeText={(v) => {
                setPassword(v)
                if (errorePassword) setErrorePassword(null)
              }}
                placeholder="Minimo 6 caratteri" placeholderTextColor="#9CA3AF" secureTextEntry={!mostraPassword} />
              <TouchableOpacity style={styles.passwordToggle} onPress={() => setMostraPassword(v => !v)}>
                <Text style={styles.passwordToggleText}>{mostraPassword ? 'Nascondi' : 'Mostra'}</Text>
              </TouchableOpacity>
            </View>
            {mode === 'register' && BETA_REGISTRAZIONE_APERTA && errorePassword ? (
              <Text style={styles.erroreInline}>{errorePassword}</Text>
            ) : null}
            {mode === 'login' && (
              <TouchableOpacity style={styles.forgotBtn} onPress={recuperaPassword} disabled={resetLoading}>
                <Text style={styles.forgotText}>{resetLoading ? 'Invio email...' : 'Password dimenticata?'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {mode === 'register' && BETA_REGISTRAZIONE_APERTA && (
            <View style={styles.terminiRow}>
              <TouchableOpacity
                style={[styles.checkbox, accettaTermini && styles.checkboxChecked]}
                onPress={() => setAccettaTermini(v => !v)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: accettaTermini }}
              >
                {accettaTermini && <Text style={styles.checkboxTick}>{'\u2713'}</Text>}
              </TouchableOpacity>
              <Text style={styles.terminiText}>
                Accetto i{' '}
                <Text style={styles.terminiLink} onPress={apriTerminiWeb}>termini e condizioni</Text>
                .{' '}
                <Text style={styles.terminiLink} onPress={apriHomepageWeb}>Scopri di più</Text>
              </Text>
            </View>
          )}

          <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : (
              <Text style={styles.btnText}>
                {mode === 'register' && BETA_REGISTRAZIONE_APERTA ? 'Crea account' : 'Accedi'}
              </Text>
            )}
          </TouchableOpacity>

          {!BETA_REGISTRAZIONE_APERTA ? (
            <Text style={styles.invitoText}>
              Vuoi accedere? Richiedi l&apos;invito su{' '}
              <Text style={styles.invitoLink} onPress={apriHomepageWeb}>
                preventivoai-web.vercel.app
              </Text>
            </Text>
          ) : null}
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
  erroreInline: { fontSize: 12, color: '#DC2626', marginTop: 6 },
  terminiRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 4 },
  terminiText: { flex: 1, fontSize: 13, color: '#6B7280', lineHeight: 19 },
  terminiLink: { color: '#0E9F8E', fontWeight: '600' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center', marginTop: 1 },
  checkboxChecked: { backgroundColor: '#0E9F8E', borderColor: '#0E9F8E' },
  checkboxTick: { color: '#fff', fontSize: 13, fontWeight: '700' },
  btn: { backgroundColor: '#0D1B2A', borderRadius: 12, padding: 14, alignItems: 'center' as const, marginTop: 8 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  invitoText: { marginTop: 16, fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 19 },
  invitoLink: { color: '#0E9F8E', fontWeight: '600' },
  biometricoBtn: { flexDirection: 'row', alignItems: 'center' as const, justifyContent: 'center', backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: '#0E9F8E', gap: 10, marginBottom: 16 },
  biometricoBtnIcon: { fontSize: 22 },
  biometricoBtnText: { fontSize: 15, color: '#0E9F8E', fontWeight: '600' as const },
})
