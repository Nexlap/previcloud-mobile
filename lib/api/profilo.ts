import * as LocalAuthentication from 'expo-local-authentication'
import * as SecureStore from 'expo-secure-store'
import { BACKEND_URL } from '../constants'
import { supabase } from '../supabase'
import { rimuoviPushToken } from './pushNotifications'

const BIOMETRIA_ULTIMO_USER_KEY = 'biometria_ultimo_user_id'
/** Chiavi pre-scoping: da cancellare una tantum al bootstrap. */
const BIOMETRIA_KEY_LEGACY = 'biometria_attiva'
const BIOMETRIA_KEY_LEGACY_OLD = 'biometrico_attivato'

export function biometriaAttivaKey(userId: string) {
  // SecureStore: solo alfanumerici, ".", "-", "_" (niente ":")
  return `biometria_attiva_${userId}`
}

export async function getUltimoUserIdBiometria(): Promise<string | null> {
  return SecureStore.getItemAsync(BIOMETRIA_ULTIMO_USER_KEY)
}

export async function setUltimoUserIdBiometria(userId: string) {
  await SecureStore.setItemAsync(BIOMETRIA_ULTIMO_USER_KEY, userId)
}

export async function isBiometriaAttivaPerUser(userId: string) {
  return (await SecureStore.getItemAsync(biometriaAttivaKey(userId))) === 'true'
}

export async function abilitaBiometriaPerUser(userId: string) {
  await SecureStore.setItemAsync(biometriaAttivaKey(userId), 'true')
  await setUltimoUserIdBiometria(userId)
  await pulisciCredenzialiLegacy()
}

export async function disabilitaBiometriaPerUser(userId: string) {
  await SecureStore.deleteItemAsync(biometriaAttivaKey(userId))
  const ultimo = await getUltimoUserIdBiometria()
  if (ultimo === userId) {
    await SecureStore.deleteItemAsync(BIOMETRIA_ULTIMO_USER_KEY)
  }
}

/** Rimuove le chiavi biometria globali pre-userId (una tantum). */
export async function pulisciBiometriaLegacyKeys(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(BIOMETRIA_KEY_LEGACY)
    await SecureStore.deleteItemAsync(BIOMETRIA_KEY_LEGACY_OLD)
  } catch {
    // silenzioso
  }
}

async function pulisciCredenzialiLegacy() {
  await SecureStore.deleteItemAsync('saved_email')
  await SecureStore.deleteItemAsync('saved_password')
}

export async function caricaProfiloUtente() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('nome_azienda, plan, trial_ends_at, onboarding_completato, termini_accettati')
    .eq('id', user.id)
    .single()

  return {
    email: user.email || '',
    nomeAzienda: data?.nome_azienda || '',
    plan: data?.plan || null,
    trialEndsAt: data?.trial_ends_at || null,
    onboardingCompletato: Boolean(data?.onboarding_completato),
    terminiAccettati: Boolean(data?.termini_accettati),
  }
}

export async function caricaStatoBiometrico() {
  const disponibile = await LocalAuthentication.hasHardwareAsync()
  const enrollato = await LocalAuthentication.isEnrolledAsync()
  const { data: { user } } = await supabase.auth.getUser()

  return {
    disponibile: disponibile && enrollato,
    attivato: user ? await isBiometriaAttivaPerUser(user.id) : false,
  }
}

export async function attivaBiometrico(promptMessage: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: profilo } = await supabase
    .from('profiles')
    .select('onboarding_completato, termini_accettati')
    .eq('id', user.id)
    .single()

  if (!profilo?.onboarding_completato || !profilo?.termini_accettati) {
    return false
  }

  const result = await LocalAuthentication.authenticateAsync({ promptMessage })
  if (!result.success) return false

  await abilitaBiometriaPerUser(user.id)
  return true
}

export async function disattivaBiometrico() {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    await disabilitaBiometriaPerUser(user.id)
  }
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
  // Isolamento multi-account: spegni biometria solo per l'utente corrente.
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id
    if (userId) {
      await disabilitaBiometriaPerUser(userId)
      await rimuoviPushToken(userId)
    }
  } catch (err) {
    if (__DEV__) {
      console.warn('[logout] cleanup pre-signOut fallito, proseguo con signOut:', err)
    }
  }

  await pulisciCredenzialiLegacy()
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
