import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { BACKEND_URL } from '../constants'
import { supabase } from '../supabase'

// iOS disabilitato fino ad Apple Developer Program
const IOS_PUSH_ENABLED = false

export async function registraPushToken(userId: string): Promise<void> {
  try {
    // Salta su iOS fino a quando non abilitiamo Apple Developer
    if (Platform.OS === 'ios' && !IOS_PUSH_ENABLED) return

    // Le push funzionano solo su dispositivo fisico
    if (!Device.isDevice) return

    const { status: esistente } = await Notifications.getPermissionsAsync()
    let statoFinale = esistente
    if (esistente !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      statoFinale = status
    }
    if (statoFinale !== 'granted') return

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '317d7a20-8484-4976-a566-d30f289f7a1c'
    })
    const token = tokenData.data

    const { data: { session } } = await supabase.auth.getSession()
    const accessToken = session?.access_token
    if (!accessToken) return

    const res = await fetch(`${BACKEND_URL}/api/registra-push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ token }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || `Registrazione push fallita (${res.status})`)
    }
  } catch (error) {
    // Non bloccare il flusso se le push falliscono
    console.error('Push token registration failed:', error)
  }
}

export async function rimuoviPushToken(userId: string): Promise<void> {
  try {
    await supabase
      .from('profiles')
      .update({ expo_push_token: null })
      .eq('id', userId)
  } catch (error) {
    console.error('Push token removal failed:', error)
  }
}
