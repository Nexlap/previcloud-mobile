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
    redirectTo: 'https://preventivoai-web.vercel.app/reset-password',
  })
}

export function onSignedOut(callback: () => void) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session) callback()
  })
  return () => subscription.unsubscribe()
}

export async function currentUserId() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return null
  return user.id
}

export async function hasCompletedProfile(userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('nome_azienda')
    .eq('id', userId)
    .single()
  return Boolean(profile?.nome_azienda?.trim())
}

export type PostAuthRoute = '/(tabs)' | '/onboarding'

export async function resolvePostAuthRoute(userId: string): Promise<PostAuthRoute> {
  const profiloCompleto = await hasCompletedProfile(userId)
  return profiloCompleto ? '/(tabs)' : '/onboarding'
}
