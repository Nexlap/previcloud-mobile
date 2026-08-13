import { router, useLocalSearchParams } from 'expo-router'
import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'

/**
 * Rotta legacy / predisposizione futura per deep link auth.
 * Nessun flusso attivo genera previcloud://callback con token.
 * Non impostare sessione da query: evita session injection via deep link.
 */
export default function AuthCallback() {
  const params = useLocalSearchParams()

  useEffect(() => {
    if (__DEV__) {
      const keys = Object.keys(params)
      console.warn(
        '[auth/callback] Invocata ma neutralizzata (nessun setSession). Parametri presenti:',
        keys.length ? keys.join(', ') : '(nessuno)',
      )
    }
    router.replace('/(auth)/login')
    // Esegui una sola volta al mount: non reimpostare sessione da URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D1B2A' }}>
      <ActivityIndicator size="large" color="#0E9F8E" />
    </View>
  )
}
