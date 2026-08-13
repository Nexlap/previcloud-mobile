import * as LocalAuthentication from 'expo-local-authentication'
import * as SecureStore from 'expo-secure-store'
import { BACKEND_URL } from '../constants'
import { supabase } from '../supabase'
import { rimuoviPushToken } from './pushNotifications'

const BIOMETRIA_ATTIVA_KEY = 'biometria_attiva'
const LEGACY_BIOMETRIA_KEY = 'biometrico_attivato'

async function isBiometriaAttiva() {
  const attivato =
    (await SecureStore.getItemAsync(BIOMETRIA_ATTIVA_KEY)) ??
    (await SecureStore.getItemAsync(LEGACY_BIOMETRIA_KEY))
  return attivato === 'true'
}

async function pulisciCredenzialiLegacy() {
  await SecureStore.deleteItemAsync('saved_email')
  await SecureStore.deleteItemAsync('saved_password')
  await SecureStore.deleteItemAsync(LEGACY_BIOMETRIA_KEY)
}

export async function caricaProfiloUtente() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('nome_azienda, plan, trial_ends_at')
    .eq('id', user.id)
    .single()

  return {
    email: user.email || '',
    nomeAzienda: data?.nome_azienda || '',
    plan: data?.plan || null,
    trialEndsAt: data?.trial_ends_at || null,
  }
}

export async function caricaStatoBiometrico() {
  const disponibile = await LocalAuthentication.hasHardwareAsync()
  const enrollato = await LocalAuthentication.isEnrolledAsync()

  return {
    disponibile: disponibile && enrollato,
    attivato: await isBiometriaAttiva(),
  }
}

export async function attivaBiometrico(promptMessage: string) {
  const result = await LocalAuthentication.authenticateAsync({ promptMessage })
  if (!result.success) return false

  await SecureStore.setItemAsync(BIOMETRIA_ATTIVA_KEY, 'true')
  await pulisciCredenzialiLegacy()
  return true
}

export async function disattivaBiometrico() {
  await SecureStore.deleteItemAsync(BIOMETRIA_ATTIVA_KEY)
  await pulisciCredenzialiLegacy()
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

export async function logoutAccount() {
  await SecureStore.deleteItemAsync(BIOMETRIA_ATTIVA_KEY)
  await pulisciCredenzialiLegacy()

  // Invalida il push token prima di chiudere la sessione (isolamento multi-account sullo stesso device).
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id
    if (userId) {
      await rimuoviPushToken(userId)
    }
  } catch (err) {
    if (__DEV__) {
      console.warn('[logout] rimuoviPushToken fallito, proseguo con signOut:', err)
    }
  }

  return supabase.auth.signOut()
}

export async function sessioneCorrente() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function eliminaAccount() {
  const session = await sessioneCorrente()
  if (!session) throw new Error('Sessione non valida. Effettua di nuovo il login.')

  const res = await fetch(`${BACKEND_URL}/api/elimina-account`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ confirm: 'ELIMINA' }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.success) throw new Error(data.error || 'Impossibile eliminare account')
  return true
}
