import * as LocalAuthentication from 'expo-local-authentication'
import * as SecureStore from 'expo-secure-store'
import { supabase } from '../supabase'

export async function caricaProfiloUtente() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('nome_azienda')
    .eq('id', user.id)
    .single()

  return { email: user.email || '', nomeAzienda: data?.nome_azienda || '' }
}

export async function caricaStatoBiometrico() {
  const disponibile = await LocalAuthentication.hasHardwareAsync()
  const enrollato = await LocalAuthentication.isEnrolledAsync()
  const attivato = await SecureStore.getItemAsync('biometrico_attivato')

  return {
    disponibile: disponibile && enrollato,
    attivato: attivato === 'true',
  }
}

export async function attivaBiometrico(promptMessage: string) {
  const result = await LocalAuthentication.authenticateAsync({ promptMessage })
  if (!result.success) return false

  await SecureStore.setItemAsync('biometrico_attivato', 'true')
  return true
}

export async function disattivaBiometrico() {
  await SecureStore.deleteItemAsync('biometrico_attivato')
  await SecureStore.deleteItemAsync('saved_email')
  await SecureStore.deleteItemAsync('saved_password')
}

export async function biometriaConfigurata() {
  const hardwareDisponibile = await LocalAuthentication.hasHardwareAsync()
  const configurata = await LocalAuthentication.isEnrolledAsync()
  return hardwareDisponibile && configurata
}

export async function confermaConBiometria(options: LocalAuthentication.LocalAuthenticationOptions) {
  return LocalAuthentication.authenticateAsync(options)
}

export async function verificaPasswordAccount(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function aggiornaPasswordAccount(nuovaPassword: string) {
  return supabase.auth.updateUser({ password: nuovaPassword })
}

export async function aggiornaPasswordBiometrico(nuovaPassword: string) {
  const attivato = await SecureStore.getItemAsync('biometrico_attivato')
  if (attivato === 'true') {
    await SecureStore.setItemAsync('saved_password', nuovaPassword)
  }
}

export async function logoutAccount() {
  return supabase.auth.signOut()
}

export async function sessioneCorrente() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}
