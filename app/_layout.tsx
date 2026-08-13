import { router, Stack } from 'expo-router'
import * as Notifications from 'expo-notifications'
import { useEffect, useRef, useState } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
import { isTrialScaduto } from 'previcloud-shared'
import 'react-native-url-polyfill/auto'
import { currentUserId, onSignedOut, resolvePostAuthRoute } from '../lib/api/auth'
import { registraPushToken } from '../lib/api/pushNotifications'
import { controllaVersioneMinima } from '../lib/api/versione'
import { AggiornamentoObbligatorioModal } from '../lib/components/AggiornamentoObbligatorioModal'
import { TerminiNonAccettatiModal } from '../lib/components/TerminiNonAccettatiModal'
import { TrialScadutoModal } from '../lib/components/TrialScadutoModal'
import { pulisciBozzaBuilderLegacy } from '../lib/builder/draft'
import { purgeCestinoScaduto } from '../lib/cestino'
import { supabase } from '../lib/supabase'
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
  const [versioneInstallata, setVersioneInstallata] = useState<string>()
  const [versioneMinima, setVersioneMinima] = useState<string>()
  const [trialScaduto, setTrialScaduto] = useState(false)
  const [terminiNonAccettati, setTerminiNonAccettati] = useState(false)
  const [splashDone, setSplashDone] = useState(false)
  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.8)).current
  const splashOpacity = useRef(new Animated.Value(1)).current
  const pendingUserIdRef = useRef<string | null>(null)
  const pendingProfiloRef = useRef<{ plan: string | null; trial_ends_at: string | null } | null>(null)
  const bootstrapInCorsoRef = useRef(false)

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
    void checkSession()

    const unsubscribe = onSignedOut(() => {
      setTerminiNonAccettati(false)
      setTrialScaduto(false)
      pendingUserIdRef.current = null
      pendingProfiloRef.current = null
      router.replace('/(auth)/login')
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      // Dopo login da schermata auth, checkSession iniziale non riesegue: ripeti il gate termini.
      if (event === 'SIGNED_IN') {
        void checkSession()
      }
    })

    return () => {
      unsubscribe()
      subscription.unsubscribe()
    }
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

  async function proseguiDopoTermini(
    userId: string,
    profilo?: { plan: string | null; trial_ends_at: string | null } | null,
  ) {
    registraPushToken(userId)
    controllaVersioneMinima().then((risultato) => {
      if (!risultato.ok) {
        setVersioneInstallata(risultato.installata)
        setVersioneMinima(risultato.minima)
        setAggiornaObbligatorio(true)
      }
    })

    let plan = profilo?.plan ?? null
    let trialEndsAt = profilo?.trial_ends_at ?? null
    if (!profilo) {
      const { data: profiloTrial } = await supabase
        .from('profiles')
        .select('plan, trial_ends_at')
        .eq('id', userId)
        .single()
      plan = profiloTrial?.plan ?? null
      trialEndsAt = profiloTrial?.trial_ends_at ?? null
    }
    if (isTrialScaduto(plan, trialEndsAt)) {
      setTrialScaduto(true)
    }

    trackSessione()
    void purgeCestinoScaduto()
    void pulisciBozzaBuilderLegacy()
    await redirectBasedOnProfile(userId)
  }

  async function checkSession() {
    if (bootstrapInCorsoRef.current) return
    bootstrapInCorsoRef.current = true
    try {
      const userId = await currentUserId()
      if (!userId) {
        completaSplash()
        router.replace('/(auth)/login')
        return
      }

      pendingUserIdRef.current = userId

      // Gate termini: prima di onboarding, trial e redirect verso home.
      const { data: profilo } = await supabase
        .from('profiles')
        .select('termini_accettati, plan, trial_ends_at')
        .eq('id', userId)
        .single()

      if (profilo && !profilo.termini_accettati) {
        pendingProfiloRef.current = {
          plan: profilo.plan ?? null,
          trial_ends_at: profilo.trial_ends_at ?? null,
        }
        setTerminiNonAccettati(true)
        completaSplash()
        return
      }

      await proseguiDopoTermini(userId, profilo
        ? { plan: profilo.plan ?? null, trial_ends_at: profilo.trial_ends_at ?? null }
        : null)
    } finally {
      bootstrapInCorsoRef.current = false
    }
  }

  function handleTerminiAccettati() {
    setTerminiNonAccettati(false)
    const userId = pendingUserIdRef.current
    if (!userId) return
    void proseguiDopoTermini(userId, pendingProfiloRef.current)
  }

  async function redirectBasedOnProfile(userId: string) {
    completaSplash()
    router.replace(await resolvePostAuthRoute(userId))
  }

  return (
    <>
      <TerminiNonAccettatiModal
        visibile={terminiNonAccettati}
        onAccettati={handleTerminiAccettati}
      />
      <AggiornamentoObbligatorioModal
        visibile={aggiornaObbligatorio && !terminiNonAccettati}
        versioneInstallata={versioneInstallata}
        versioneMinima={versioneMinima}
      />
      <TrialScadutoModal visibile={trialScaduto && !terminiNonAccettati} />
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
