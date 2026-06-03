import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView, Alert
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '../../lib/supabase'

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!email || !password) {
      Alert.alert('Errore', 'Inserisci email e password')
      return
    }
    setLoading(true)
    if (mode === 'register') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) Alert.alert('Errore', error.message)
      else Alert.alert('Fatto!', 'Controlla la tua email per confermare.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) Alert.alert('Errore', 'Email o password non corretti.')
      else router.replace('/(tabs)')
    }
    setLoading(false)
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
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
          <View style={styles.inputWrap}>
            <Text style={styles.label}>EMAIL</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail}
              placeholder="es. mario@gmail.com" placeholderTextColor="#9CA3AF"
              keyboardType="email-address" autoCapitalize="none" />
          </View>
          <View style={styles.inputWrap}>
            <Text style={styles.label}>PASSWORD</Text>
            <TextInput style={styles.input} value={password} onChangeText={setPassword}
              placeholder="Minimo 6 caratteri" placeholderTextColor="#9CA3AF" secureTextEntry />
          </View>
          <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{mode === 'login' ? 'Accedi' : 'Crea account'}</Text>}
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
  toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  toggleActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  toggleText: { fontSize: 14, fontWeight: '500', color: '#9CA3AF' },
  toggleTextActive: { color: '#0D1B2A' },
  inputWrap: { marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.8, marginBottom: 6 },
  input: { backgroundColor: '#F7F8FA', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 12, fontSize: 14, color: '#0D1B2A' },
  btn: { backgroundColor: '#0D1B2A', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
})