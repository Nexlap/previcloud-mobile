import { supabase } from '../supabase'

export async function hasSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return !!session
}

export async function sessionToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || ''
}

export async function setAuthSession(accessToken: string, refreshToken: string) {
  return supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
}

export function signUpWithEmail(email: string, password: string) {
  return supabase.auth.signUp({ email, password })
}

export function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

export function resetPassword(email: string) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://previcloud.it/reset-password',
  })
}

export function onSignedOut(callback: () => void) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') callback()
  })
  return () => subscription.unsubscribe()
}

export async function currentUserId() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return null
  return user.id
}

export async function hasCompletedProfile(userId: string) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('onboarding_completato')
    .eq('id', userId)
    .single()
  // PGRST116 (nessuna riga trovata) è legittimo per un utente nuovo; qualsiasi altro
  // errore (rete/RLS/timeout) va propagato invece di restituire false in silenzio,
  // altrimenti un utente esistente rischia di essere rimandato a /onboarding.
  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message)
  }
  return Boolean(profile?.onboarding_completato)
}

export async function hasAcceptedTermini(userId: string) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('termini_accettati')
    .eq('id', userId)
    .single()
  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message)
  }
  return Boolean(profile?.termini_accettati)
}

export type PostAuthRoute = '/(tabs)' | '/onboarding' | '/(auth)/termini-richiesti'

async function resolvePostAuthRouteOnce(userId: string): Promise<PostAuthRoute> {
  // Gate termini: prima di onboarding/tabs, così vale per cold start, password e biometria.
  const terminiOk = await hasAcceptedTermini(userId)
  if (!terminiOk) return '/(auth)/termini-richiesti'

  const profiloCompleto = await hasCompletedProfile(userId)
  return profiloCompleto ? '/(tabs)' : '/onboarding'
}

export async function resolvePostAuthRoute(userId: string): Promise<PostAuthRoute> {
  try {
    return await resolvePostAuthRouteOnce(userId)
  } catch (err: unknown) {
    console.error('[auth] resolvePostAuthRoute: primo tentativo fallito, riprovo', err)
    try {
      return await resolvePostAuthRouteOnce(userId)
    } catch (err2: unknown) {
      // Fail-closed sui termini: senza verifica non instradiamo a /(tabs), altrimenti
      // un errore di rete potrebbe bypassare termini_accettati=false.
      console.error('[auth] resolvePostAuthRoute: fallito anche il retry', err2)
      return '/(auth)/termini-richiesti'
    }
  }
}
