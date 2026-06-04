import { router, Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import 'react-native-url-polyfill/auto'
import { supabase } from '../lib/supabase'

export default function RootLayout() {
  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/(auth)/login')
        return
      }
      // Controlla se il profilo è configurato
      const { data: profile } = await supabase
        .from('profiles')
        .select('nome_azienda')
        .eq('id', session.user.id)
        .single()

      if (!profile?.nome_azienda) {
        router.replace('/onboarding')
      } else {
        router.replace('/(tabs)')
      }
    }

    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        router.replace('/(auth)/login')
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('nome_azienda')
        .eq('id', session.user.id)
        .single()

      if (!profile?.nome_azienda) {
        router.replace('/onboarding')
      } else {
        router.replace('/(tabs)')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  )
}