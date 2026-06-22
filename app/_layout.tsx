import { router, Stack } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
import 'react-native-url-polyfill/auto'
import { currentUserId, hasCompletedProfile, onSignedOut } from '../lib/api/auth'
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

export default function RootLayout() {
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

  async function checkSession() {
    const userId = await currentUserId()
    if (!userId) { completaSplash(); router.replace('/(auth)/login'); return }
    trackSessione()
    void purgeCestinoScaduto()
    await redirectBasedOnProfile(userId)
  }

  async function redirectBasedOnProfile(userId: string) {
    const profiloCompleto = await hasCompletedProfile(userId)
    completaSplash()
    if (!profiloCompleto) {
      router.replace('/onboarding')
    } else {
      router.replace('/(tabs)')
    }
  }

  return (
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
