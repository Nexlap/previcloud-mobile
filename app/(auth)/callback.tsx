import { router, useLocalSearchParams } from 'expo-router'
import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { currentUserId, resolvePostAuthRoute, setAuthSession } from '../../lib/api/auth'

export default function AuthCallback() {
  const params = useLocalSearchParams()
  const access_token = params.access_token as string | undefined
  const refresh_token = params.refresh_token as string | undefined

  useEffect(() => {
    async function handleCallback() {
      if (!access_token || !refresh_token) {
        router.replace('/(auth)/login')
        return
      }

      await setAuthSession(access_token, refresh_token)
      const userId = await currentUserId()
      if (!userId) {
        router.replace('/(auth)/login')
        return
      }

      router.replace(await resolvePostAuthRoute(userId))
    }

    void handleCallback()
  }, [access_token, refresh_token])

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D1B2A' }}>
      <ActivityIndicator size="large" color="#0E9F8E" />
    </View>
  )
}
