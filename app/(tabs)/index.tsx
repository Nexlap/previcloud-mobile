import { router, useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator, RefreshControl, ScrollView, StyleSheet,
  Text, TouchableOpacity, View
} from 'react-native'
import { eventBus } from "../../lib/eventBus"
import { caricaHomeData } from '../../lib/api/home'
import { Preventivo, Profile } from "../../lib/types"
import { trackEvento } from "../../lib/utils/analytics"
import { formatImportoEuro, formatImportoDb } from '../../lib/utils/importo'
import { PreventivoStatoBadge } from '../../lib/components/preventivo/PreventivoStatoBadge'
import { NotificheBell } from '../../lib/components/firma/NotificheBell'
import { ProfileMenuButton } from '../../lib/components/ProfileMenuButton'
import { AppIcon, type AppIconName } from '../../lib/components/icons/AppIcon'
import { useScreenTheme } from '../../lib/hooks/useScreenTheme'

type QuickItem = { icon: AppIconName; label: string; path: string }

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
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useFocusEffect(useCallback(() => {
    trackEvento('home_aperta', 'home')
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

  async function carica() {
    const data = await caricaHomeData()
    if (!data) { router.replace('/(auth)/login'); return }
    if (data.profile) setProfile(data.profile)
    setPreventivi(data.preventivi)
    setCollegamentiPiano(data.collegamentiPiano)
    setPagamentiIncassati(data.pagamentiIncassati)
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

  return (
    <View style={s.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.saluto}>{saluto},</Text>
          <Text style={styles.nome}>{nome}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <NotificheBell />
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
          <View style={[s.card, styles.statCard]}>
            <Text style={[styles.statVal, { color: colors.text }]}>{preventivi.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Preventivi</Text>
          </View>
          <View style={[styles.statCard, styles.statCardAccent]}>
            <Text
              style={[styles.statVal, styles.statValCompact, { color: '#fff' }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {`€${formatImportoEuro(pagamentiIncassati)}`}
            </Text>
            <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.7)' }]}>Pagamenti incassati</Text>
          </View>
          <View style={[s.card, styles.statCard]}>
            <Text style={[styles.statVal, { color: colors.text }]}>{preventivi.length * 23}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Min. risparmiate</Text>
          </View>
        </View>

        <View style={s.cardLg}>
          <View style={styles.sectionHeader}>
            <Text style={s.title}>Ultimi preventivi</Text>
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
            preventivi.map((p, i) => (
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
                  <Text style={styles.prevAvatarText}>{(p.nome_cliente || 'S').charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.prevLeft}>
                  <Text style={[styles.prevCliente, { color: colors.text }]}>{p.nome_cliente || 'Senza cliente'}</Text>
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
            ))
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
  statCard: { flex: 1, padding: 14, alignItems: 'center', minWidth: 0 },
  statCardAccent: { backgroundColor: '#0D1B2A', borderColor: '#0D1B2A' },
  statVal: { fontSize: 20, fontWeight: '700' },
  statValCompact: { width: '100%', textAlign: 'center' },
  statLabel: { fontSize: 10, marginTop: 3, textAlign: 'center' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  sectionLink: { fontSize: 13, color: '#0E9F8E', fontWeight: '500' },
  emptyBox: { padding: 32, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 14, fontWeight: '500' },
  emptySub: { fontSize: 12 },
  prevRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  prevAvatar: { width: 36, height: 36, borderRadius: 18 },
  prevAvatarText: { fontSize: 14, fontWeight: '700', color: '#0E9F8E' },
  prevLeft: { flex: 1 },
  prevCliente: { fontSize: 14, fontWeight: '500' },
  prevPianoBadge: { fontSize: 10, color: '#0E9F8E', fontWeight: '600', marginTop: 2 },
  prevData: { fontSize: 11, marginTop: 2 },
  prevRight: { alignItems: 'flex-end', gap: 4 },
  prevImporto: { fontSize: 14, fontWeight: '600' },
  quickGrid: { flexDirection: 'row', gap: 10 },
  quickLabel: { fontSize: 11, fontWeight: '500', textAlign: 'center', width: '100%' },
})
