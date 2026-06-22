import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { currentUserId, hasSession, resolvePostAuthRoute } from '../lib/api/auth'

export default function Index() {
  useEffect(() => {
    void (async () => {
      const sessioneAttiva = await hasSession()
      if (!sessioneAttiva) {
        router.replace('/(auth)/login')
        return
      }
      const userId = await currentUserId()
      if (!userId) {
        router.replace('/(auth)/login')
        return
      }
      router.replace(await resolvePostAuthRoute(userId))
    })()
  }, [])

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D1B2A' }}>
      <ActivityIndicator size="large" color="#0E9F8E" />
    </View>
  )
}
