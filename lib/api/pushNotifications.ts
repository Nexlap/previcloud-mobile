import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
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
      projectId: 'a842ab0e-24f7-41b4-b93a-6b97a75b9621'
    })
    const token = tokenData.data

    await supabase
      .from('profiles')
      .update({ expo_push_token: token })
      .eq('id', userId)
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
