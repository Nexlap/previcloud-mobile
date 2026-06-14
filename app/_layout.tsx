import { router, Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import 'react-native-url-polyfill/auto'
import { supabase } from "../lib/supabase"

export default function RootLayout() {
  useEffect(() => {
    checkSession()

    // Ascolta i cambi di sessione
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  async (_event: any, session: any) => {
    if (_event === 'SIGNED_OUT' || !session) {
      router.replace('/(auth)/login')
    }
  }
)
    return () => subscription.unsubscribe()
  }, [])

  async function checkSession() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (!user || error) { router.replace('/(auth)/login'); return }
    await redirectBasedOnProfile(user.id)
  }

  async function redirectBasedOnProfile(userId: string) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('nome_azienda')
      .eq('id', userId)
      .single()

    if (!profile?.nome_azienda) {
      router.replace('/onboarding')
    } else {
      router.replace('/(tabs)')
    }
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  )
}
