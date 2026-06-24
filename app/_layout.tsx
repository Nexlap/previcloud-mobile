import { router, Stack } from 'expo-router'
import * as Notifications from 'expo-notifications'
import { useEffect, useRef, useState } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
import 'react-native-url-polyfill/auto'
import { currentUserId, onSignedOut, resolvePostAuthRoute } from '../lib/api/auth'
import { registraPushToken } from '../lib/api/pushNotifications'
import { controllaVersioneMinima } from '../lib/api/versione'
import { AggiornamentoObbligatorioModal } from '../lib/components/AggiornamentoObbligatorioModal'
import { purgeCestinoScaduto } from '../lib/cestino'
import { ThemeProvider, useTheme } from '../lib/theme/ThemeContext'
import { ThemedStatusBar } from '../lib/theme/ThemedStatusBar'
import { NotificheProvider } from '../lib/hooks/useNotifiche'
import { trackSessione } from '../lib/utils/analytics'

function RootStack() {
  const { colors } = useTheme()
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      />
    </View>
  )
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

export default function RootLayout() {
  const [aggiornaObbligatorio, setAggiornaObbligatorio] = useState(false)
  const [splashDone, setSplashDone] = useState(false)
  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.8)).current
  const splashOpacity = useRef(new Animated.Value(1)).current

  useEffect(() => {
    // Animazione entrata
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start()
  }, [])

  function completaSplash() {
    Animated.timing(splashOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
      setSplashDone(true)
    })
  }

  useEffect(() => {
    checkSession()

    const unsubscribe = onSignedOut(() => {
      router.replace('/(auth)/login')
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    const subRicezione = Notifications.addNotificationReceivedListener(() => {
      // Push ricevuta in foreground — il toast in-app via Realtime
      // gestisce già la UI, non serve fare altro
    })

    const subTap = Notifications.addNotificationResponseReceivedListener((response) => {
      const dati = response.notification.request.content.data as {
        tipo?: string
        riferimentoId?: string
      }
      // Navigazione al tap sulla push — solo se c'è un riferimentoId
      if (dati?.riferimentoId) {
        router.push(`/screens/preventivo-pdf?id=${dati.riferimentoId}`)
      }
    })

    return () => {
      subRicezione.remove()
      subTap.remove()
    }
  }, [])

  async function checkSession() {
    const userId = await currentUserId()
    if (!userId) { completaSplash(); router.replace('/(auth)/login'); return }
    if (userId) {
      registraPushToken(userId)
      controllaVersioneMinima().then((ok) => {
        if (!ok) setAggiornaObbligatorio(true)
      })
    }
    trackSessione()
    void purgeCestinoScaduto()
    await redirectBasedOnProfile(userId)
  }

  async function redirectBasedOnProfile(userId: string) {
    completaSplash()
    router.replace(await resolvePostAuthRoute(userId))
  }

  return (
    <>
      <AggiornamentoObbligatorioModal visibile={aggiornaObbligatorio} />
    <ThemeProvider>
      <NotificheProvider>
        <ThemedStatusBar />
        <RootStack />
        {!splashDone && (
        <Animated.View style={[styles.splash, { opacity: splashOpacity }]}>
          <Animated.View style={[styles.logoContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>P</Text>
            </View>
            <View style={styles.dotsRow}>
              {[0, 1, 2].map(i => (
                <PulseDot key={i} delay={i * 200} />
              ))}
            </View>
          </Animated.View>
        </Animated.View>
      )}
      </NotificheProvider>
    </ThemeProvider>
    </>
  )
}

function PulseDot({ delay }: { delay: number }) {
  const anim = useRef(new Animated.Value(0.3)).current
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 400, useNativeDriver: true }),
      ])
    ).start()
  }, [])
  return <Animated.View style={[styles.dot, { opacity: anim }]} />
}

const styles = StyleSheet.create({
  splash: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0D1B2A', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  logoContainer: { alignItems: 'center', gap: 32 },
  logoCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#0E9F8E', justifyContent: 'center', alignItems: 'center', shadowColor: '#0E9F8E', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 12 },
  logoText: { color: '#fff', fontSize: 36, fontWeight: '800', letterSpacing: -1 },
  dotsRow: { flexDirection: 'row', gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#0E9F8E' },
})
