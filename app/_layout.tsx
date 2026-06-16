import { router, Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useRef, useState } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
import 'react-native-url-polyfill/auto'
import { supabase } from "../lib/supabase"

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

    // Ascolta i cambi di sessione
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  async (_event: any, session: any) => {
    if (_event === 'SIGNED_OUT' || !session) {
      router.replace('/(auth)/login')
    }
  }
)
    return () => subscription.unsubscribe()
  }, [])

  async function checkSession() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (!user || error) { completaSplash(); router.replace('/(auth)/login'); return }
    await redirectBasedOnProfile(user.id)
  }

  async function redirectBasedOnProfile(userId: string) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('nome_azienda')
      .eq('id', userId)
      .single()

    completaSplash()
    if (!profile?.nome_azienda) {
      router.replace('/onboarding')
    } else {
      router.replace('/(tabs)')
    }
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
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
