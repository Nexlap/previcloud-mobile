import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { router } from 'expo-router'
import { supabase } from '../lib/supabase'
import 'react-native-url-polyfill/auto'

export default function RootLayout() {
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/(tabs)')
      } else {
        router.replace('/(auth)/login')
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        router.replace('/(tabs)')
      } else {
        router.replace('/(auth)/login')
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