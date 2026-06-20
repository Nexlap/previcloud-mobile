import { router, useLocalSearchParams } from 'expo-router'
import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { currentUserId, hasCompletedProfile, setAuthSession } from '../../lib/api/auth'

export default function AuthCallback() {
  const params = useLocalSearchParams()

  useEffect(() => {
    async function handleCallback() {
      const access_token = params.access_token as string
      const refresh_token = params.refresh_token as string

      if (access_token && refresh_token) {
        await setAuthSession(access_token, refresh_token)
        const userId = await currentUserId()
        if (!userId) {
          router.replace('/(auth)/login')
          return
        }
        const profiloCompleto = await hasCompletedProfile(userId)
        router.replace(profiloCompleto ? '/(tabs)' : '/onboarding')
      } else {
        router.replace('/(auth)/login')
      }
    }
    handleCallback()
  }, [])

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D1B2A' }}>
      <ActivityIndicator size="large" color="#0E9F8E" />
    </View>
  )
}
