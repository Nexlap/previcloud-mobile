import AsyncStorage from '@react-native-async-storage/async-storage'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator, Linking, RefreshControl, ScrollView, StyleSheet,
  Text, TouchableOpacity, View
} from 'react-native'
import { eventBus } from "../../lib/eventBus"
import { caricaHomeData } from '../../lib/api/home'
import { Preventivo, Profile } from "../../lib/types"
import { trackEvento } from "../../lib/api/track"
import { formatImportoEuroVisuale, formatImportoDb } from 'previcloud-shared'
import { PreventivoStatoBadge } from '../../lib/components/preventivo/PreventivoStatoBadge'
import { NotificheBell } from '../../lib/components/firma/NotificheBell'
import { ProfileMenuButton } from '../../lib/components/ProfileMenuButton'
import { AppIcon, type AppIconName } from '../../lib/components/icons/AppIcon'
import { useScreenTheme } from '../../lib/hooks/useScreenTheme'

type QuickItem = { icon: AppIconName; label: string; path: string }

const BANNER_PRODOTTI_KEY = 'banner_prodotti_chiuso'
const PRODOTTI_DIGITALI_URL = 'https://previcloud.it/dashboard/prodotti'

const QUICK_ITEMS: QuickItem[] = [
  { icon: 'users', label: 'Clienti', path: '/(tabs)/clienti' },
  { icon: 'file-text', label: 'Builder', path: '/screens/builder' },
  { icon: 'mic', label: 'Registra', path: '/screens/registra' },
  { icon: 'settings', label: 'Impostazioni', path: '/screens/settings' },
]

export default function Home() {
  const { colors, s } = useScreenTheme()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [preventivi, setPreventivi] = useState<Preventivo[]>([])
  const [collegamentiPiano, setCollegamentiPiano] = useState<Record<string, 'canone' | 'rate'>>({})
  const [pagamentiIncassati, setPagamentiIncassati] = useState(0)
  const [preventiviMese, setPreventiviMese] = useState(0)
  const [preventiviMeseScorso, setPreventiviMeseScorso] = useState(0)
  const [preventiviTotali, setPreventiviTotali] = useState(0)
  const [minutiRisparmiati, setMinutiRisparmiati] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [bannerProdottiChiuso, setBannerProdottiChiuso] = useState<boolean | null>(null)

  useEffect(() => {
    AsyncStorage.getItem(BANNER_PRODOTTI_KEY).then(val => {
      setBannerProdottiChiuso(val === 'true')
    })
  }, [])

  useFocusEffect(useCallback(() => {
    trackEvento('schermata_aperta', 'home')
    carica()
  }, []))

  const caricaRef = useRef(carica)
  useEffect(() => { caricaRef.current = carica })

  useEffect(() => {
    const handler = () => { caricaRef.current() }
    eventBus.on('aggiorna-home', handler)
    return () => { eventBus.off('aggiorna-home', handler) }
  }, [])

  async function onRefresh() {
    setRefreshing(true)
    await carica()
    setRefreshing(false)
  }

  async function chiudiBannerProdotti() {
    setBannerProdottiChiuso(true)
    await AsyncStorage.setItem(BANNER_PRODOTTI_KEY, 'true')
  }

  async function apriProdottiDigitali() {
    if (await Linking.canOpenURL(PRODOTTI_DIGITALI_URL)) {
      await Linking.openURL(PRODOTTI_DIGITALI_URL)
    }
  }

  async function carica() {
    const data = await caricaHomeData()
    if (!data) { router.replace('/(auth)/login'); return }
    if (data.profile) setProfile(data.profile)
    setPreventivi(data.preventivi)
    setCollegamentiPiano(data.collegamentiPiano)
    setPagamentiIncassati(data.pagamentiIncassati)
    setPreventiviMese(data.preventiviMese)
    setPreventiviMeseScorso(data.preventiviMeseScorso)
    setPreventiviTotali(data.preventiviTotali)
    setMinutiRisparmiati(data.minutiRisparmiati)
    setLoading(false)
  }

  if (loading) return (
    <View style={s.center}>
      <ActivityIndicator size="large" color="#0E9F8E" />
    </View>
  )

  const nome = profile?.nome_azienda?.split(' ')[0] || 'Artigiano'
  const ora = new Date().getHours()
  const saluto = ora < 12 ? 'Buongiorno' : ora < 18 ? 'Buon pomeriggio' : 'Buonasera'
  const trendPositivo = preventiviMeseScorso > 0 && preventiviMese >= preventiviMeseScorso

  return (
    <View style={s.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.saluto}>{saluto},</Text>
          <Text style={styles.nome}>{nome} 👋</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <NotificheBell iconColor="#fff" />
          <ProfileMenuButton nomeBreve={nome} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0E9F8E" colors={["#0E9F8E"]} />}
      >
        <View style={styles.statsRow}>
          <View style={[styles.statCard, s.card]}>
            <Text style={[styles.statVal, { color: colors.text }]}>{preventiviMese}</Text>
            <Text
              style={[styles.statLabel, { color: colors.textMuted }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              Questo mese
            </Text>
            <Text
              style={[styles.statTrend, { color: trendPositivo ? colors.accentInk : colors.textMuted }, preventiviMeseScorso <= 0 && styles.statTrendHidden]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {trendPositivo ? '↑' : '↓'} {preventiviMeseScorso} mese scorso
            </Text>
          </View>
          <View style={[styles.statCard, styles.statCardAccent]}>
            <Text
              style={[styles.statVal, styles.statValCompact, { color: '#fff' }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {`€${formatImportoEuroVisuale(pagamentiIncassati)}`}
            </Text>
            <Text
              style={[styles.statLabel, styles.statLabelOnDark]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              Pagamenti incassati
            </Text>
            <Text style={[styles.statTrend, styles.statTrendHidden]} numberOfLines={1}> </Text>
          </View>
          <View style={[styles.statCard, s.card]}>
            <Text style={[styles.statVal, { color: colors.text }]}>{minutiRisparmiati}</Text>
            <Text
              style={[styles.statLabel, { color: colors.textMuted }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              Minuti* risparmiati
            </Text>
            <Text style={[styles.statTrend, styles.statTrendHidden]} numberOfLines={1}> </Text>
          </View>
        </View>

        {bannerProdottiChiuso === false ? (
          <View style={styles.prodottiBannerWrap}>
            <TouchableOpacity
              style={[styles.prodottiBanner, { borderColor: colors.border, backgroundColor: colors.surface }]}
              onPress={apriProdottiDigitali}
              activeOpacity={0.85}
            >
              <View style={styles.prodottiBannerGradientTeal} pointerEvents="none" />
              <View style={[styles.prodottiBannerGradientFade, { backgroundColor: colors.surface }]} pointerEvents="none" />
              <View style={styles.prodottiBannerInner}>
                <AppIcon name="shopping-bag" size={26} color="#0B7A6D" />
                <View style={styles.prodottiBannerText}>
                  <Text style={[styles.prodottiBannerTitle, { color: colors.text }]}>Vendi i tuoi contenuti digitali</Text>
                  <Text style={[styles.prodottiBannerSub, { color: colors.textMuted }]}>Guide, template, video — incassa online</Text>
                </View>
                <TouchableOpacity onPress={apriProdottiDigitali} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Scopri prodotti digitali">
                  <AppIcon name="arrow-right" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.prodottiBannerClose}
              onPress={chiudiBannerProdotti}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel="Chiudi banner"
            >
              <AppIcon name="x" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={s.cardLg}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Text style={s.title}>Ultimi preventivi</Text>
              {preventiviTotali > 0 ? (
                <Text style={[styles.sectionSub, { color: colors.textMuted }]}>
                  {preventiviTotali} totali · ultimi {Math.min(preventivi.length, 5)} in evidenza
                </Text>
              ) : null}
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/storico')}>
              <Text style={styles.sectionLink}>Vedi tutti →</Text>
            </TouchableOpacity>
          </View>
          {preventivi.length === 0 ? (
            <View style={styles.emptyBox}>
              <AppIcon name="file-text" size={32} color={colors.icon} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Nessun preventivo ancora</Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>Tocca + per generare il primo</Text>
            </View>
          ) : (
            preventivi.map((p, i) => {
              const titoloRiga = p.titolo || p.nome_cliente || 'Senza titolo'
              return (
              <TouchableOpacity
                key={p.id}
                style={[styles.prevRow, s.rowBorder, i === preventivi.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => {
                  if (p.cliente_id) {
                    router.push({ pathname: '/screens/cliente-dettaglio', params: { id: p.cliente_id, nome: p.nome_cliente || 'Cliente' } })
                  } else {
                    router.push('/(tabs)/storico')
                  }
                }}
              >
                <View style={[styles.prevAvatar, s.avatar]}>
                  <Text style={styles.prevAvatarText}>{titoloRiga.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.prevLeft}>
                  <Text style={[styles.prevCliente, { color: colors.text }]}>{titoloRiga}</Text>
                  {collegamentiPiano[p.id] ? (
                    <Text style={styles.prevPianoBadge}>
                      {collegamentiPiano[p.id] === 'rate' ? 'Piano a rate collegato' : 'Abbonamento collegato'}
                    </Text>
                  ) : null}
                  <Text style={[styles.prevData, { color: colors.textMuted }]}>
                    {new Date(p.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                  </Text>
                </View>
                <View style={styles.prevRight}>
                  <Text style={[styles.prevImporto, { color: colors.text }]}>{p.importo_totale ? `€${formatImportoDb(p.importo_totale)}` : '—'}</Text>
                  <PreventivoStatoBadge
                    stato={p.stato}
                    pagato={p.pagato}
                    pagamentoGestitoDalPiano={!!collegamentiPiano[p.id]}
                  />
                </View>
              </TouchableOpacity>
            )})
          )}
        </View>

        <Text style={s.title}>Accesso rapido</Text>
        <View style={styles.quickGrid}>
          {QUICK_ITEMS.map(item => (
            <TouchableOpacity key={item.path} style={s.quickCard} onPress={() => router.push(item.path as never)} activeOpacity={0.7}>
              <AppIcon name={item.icon} size={22} color={colors.icon} />
              <Text
                style={[styles.quickLabel, { color: colors.textMuted }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#0D1B2A', paddingTop: 60, paddingBottom: 24, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  saluto: { fontSize: 14, color: '#9CA3AF' },
  nome: { fontSize: 22, fontWeight: '700', color: '#fff', marginTop: 2 },
  scroll: { flex: 1 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, padding: 14, alignItems: 'center', justifyContent: 'center', minWidth: 0, borderRadius: 16 },
  statCardAccent: { backgroundColor: '#0D1B2A', borderColor: '#0D1B2A', borderWidth: 1, shadowColor: '#0D1B2A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
  statVal: { fontSize: 20, lineHeight: 24, fontWeight: '700', width: '100%', textAlign: 'center' },
  statValCompact: { width: '100%', textAlign: 'center' },
  statLabel: { fontSize: 10, marginTop: 3, textAlign: 'center' },
  statTrend: { fontSize: 9, lineHeight: 12, marginTop: 4, textAlign: 'center', fontWeight: '500' },
  statTrendHidden: { opacity: 0 },
  statLabelOnDark: { color: 'rgba(255,255,255,0.7)' },
  prodottiBannerWrap: { position: 'relative' },
  prodottiBanner: {
    borderRadius: 12,
    overflow: 'hidden',
    borderLeftWidth: 3,
    borderLeftColor: '#0E9F8E',
    borderWidth: 1,
    shadowColor: '#0D1B2A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  prodottiBannerGradientTeal: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(14, 159, 142, 0.1)',
  },
  prodottiBannerGradientFade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '35%',
    right: 0,
    opacity: 0.92,
  },
  prodottiBannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 28,
    gap: 10,
  },
  prodottiBannerText: { flex: 1, gap: 2 },
  prodottiBannerTitle: { fontSize: 14, fontWeight: '600' },
  prodottiBannerSub: { fontSize: 11 },
  prodottiBannerClose: { position: 'absolute', top: 6, right: 8, zIndex: 1, padding: 6 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  sectionHeaderLeft: { flex: 1, gap: 2, paddingRight: 8 },
  sectionSub: { fontSize: 11 },
  sectionLink: { fontSize: 13, color: '#0B7A6D', fontWeight: '500' },
  emptyBox: { padding: 32, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 14, fontWeight: '500' },
  emptySub: { fontSize: 12 },
  prevRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  prevAvatar: { width: 36, height: 36, borderRadius: 18 },
  prevAvatarText: { fontSize: 14, fontWeight: '700', color: '#0B7A6D' },
  prevLeft: { flex: 1 },
  prevCliente: { fontSize: 14, fontWeight: '500' },
  prevPianoBadge: { fontSize: 10, color: '#0B7A6D', fontWeight: '600', marginTop: 2 },
  prevData: { fontSize: 11, marginTop: 2 },
  prevRight: { alignItems: 'flex-end', gap: 4 },
  prevImporto: { fontSize: 14, fontWeight: '600' },
  quickGrid: { flexDirection: 'row', gap: 10 },
  quickLabel: { fontSize: 11, fontWeight: '500', textAlign: 'center', width: '100%' },
})
