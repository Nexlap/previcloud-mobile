import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { hasSession } from '../lib/api/auth'

export default function Index() {
  useEffect(() => {
    hasSession().then((sessioneAttiva) => {
      if (sessioneAttiva) {
        router.replace('/(tabs)')
      } else {
        router.replace('/(auth)/login')
      }
    })
  }, [])

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D1B2A' }}>
      <ActivityIndicator size="large" color="#0E9F8E" />
    </View>
  )
}
