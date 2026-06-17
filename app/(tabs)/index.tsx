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
import { formatImportoEuro } from '../../lib/utils/importo'
import { PreventivoStatoBadge } from '../../lib/components/preventivo/PreventivoStatoBadge'

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [preventivi, setPreventivi] = useState<Preventivo[]>([])
  const [pagamentiIncassati, setPagamentiIncassati] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Ricarica ogni volta che la dashboard torna in focus
  useFocusEffect(useCallback(() => {
    trackEvento('home_aperta', 'home')
    carica()
  }, []))

  // Ricarica quando un'altra schermata segnala un cambio stato
const caricaRef = useRef(carica)
useEffect(() => { caricaRef.current = carica })

useEffect(() => {
  const handler = () => {
    caricaRef.current()
  }
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
    setPagamentiIncassati(data.pagamentiIncassati)
    setLoading(false)
  }

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#0E9F8E" />
    </View>
  )

  const nome = profile?.nome_azienda?.split(' ')[0] || 'Artigiano'
  const ora = new Date().getHours()
  const saluto = ora < 12 ? 'Buongiorno' : ora < 18 ? 'Buon pomeriggio' : 'Buonasera'

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.saluto}>{saluto},</Text>
          <Text style={styles.nome}>{nome} 👋</Text>
        </View>
        <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/screens/profilo')}>
          <Text style={styles.profileBtnText}>{(nome || 'A').charAt(0).toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0E9F8E" colors={["#0E9F8E"]} />}
      >
        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{preventivi.length}</Text>
            <Text style={styles.statLabel}>Preventivi</Text>
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
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{preventivi.length * 23}</Text>
            <Text style={styles.statLabel}>Min. risparmiate</Text>
          </View>
        </View>

        {/* Ultimi preventivi */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ultimi preventivi</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/storico')}>
              <Text style={styles.sectionLink}>Vedi tutti →</Text>
            </TouchableOpacity>
          </View>
          {preventivi.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>📄</Text>
              <Text style={styles.emptyText}>Nessun preventivo ancora</Text>
              <Text style={styles.emptySub}>Tocca + per generare il primo</Text>
            </View>
          ) : (
            preventivi.map((p, i) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.prevRow, i === preventivi.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => {
                  if (p.cliente_id) {
                    router.push({ pathname: '/screens/cliente-dettaglio', params: { id: p.cliente_id, nome: p.nome_cliente || 'Cliente' } })
                  } else {
                    router.push('/(tabs)/storico')
                  }
                }}
              >
                <View style={styles.prevAvatar}>
                  <Text style={styles.prevAvatarText}>{(p.nome_cliente || 'S').charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.prevLeft}>
                  <Text style={styles.prevCliente}>{p.nome_cliente || 'Senza cliente'}</Text>
                  <Text style={styles.prevData}>
                    {new Date(p.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                  </Text>
                </View>
                <View style={styles.prevRight}>
                  <Text style={styles.prevImporto}>{p.importo_totale ? `€${p.importo_totale}` : '—'}</Text>
                  <PreventivoStatoBadge stato={p.stato} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Accesso rapido */}
        <Text style={styles.quickTitle}>Accesso rapido</Text>
        <View style={styles.quickGrid}>
          {[
            { icon: '👥', label: 'Clienti', path: '/(tabs)/clienti' },
            { icon: '📋', label: 'Builder', path: '/screens/builder' },
            { icon: '🎙', label: 'Registra', path: '/screens/registra' },
            { icon: '⚙️', label: 'Impostazioni', path: '/screens/settings' },
          ].map(item => (
            <TouchableOpacity key={item.path} style={styles.quickCard} onPress={() => router.push(item.path as any)}>
              <Text style={styles.quickIcon}>{item.icon}</Text>
              <Text style={styles.quickLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F8FA' },
  header: { backgroundColor: '#0D1B2A', paddingTop: 60, paddingBottom: 24, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  saluto: { fontSize: 14, color: '#9CA3AF' },
  nome: { fontSize: 22, fontWeight: '700', color: '#fff', marginTop: 2 },
  profileBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#0E9F8E', justifyContent: 'center', alignItems: 'center' },
  profileBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  scroll: { flex: 1 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', minWidth: 0 },
  statCardAccent: { backgroundColor: '#0D1B2A', borderColor: '#0D1B2A' },
  statVal: { fontSize: 20, fontWeight: '700', color: '#0D1B2A' },
  statValCompact: { width: '100%', textAlign: 'center' },
  statLabel: { fontSize: 10, color: '#9CA3AF', marginTop: 3, textAlign: 'center' },
  section: { backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#0D1B2A' },
  sectionLink: { fontSize: 13, color: '#0E9F8E', fontWeight: '500' },
  emptyBox: { padding: 32, alignItems: 'center', gap: 6 },
  emptyIcon: { fontSize: 32 },
  emptyText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  emptySub: { fontSize: 12, color: '#9CA3AF' },
  prevRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 12 },
  prevAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center' },
  prevAvatarText: { fontSize: 14, fontWeight: '700', color: '#0E9F8E' },
  prevLeft: { flex: 1 },
  prevCliente: { fontSize: 14, fontWeight: '500', color: '#0D1B2A' },
  prevData: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  prevRight: { alignItems: 'flex-end', gap: 4 },
  prevImporto: { fontSize: 14, fontWeight: '600', color: '#0D1B2A' },
  quickTitle: { fontSize: 15, fontWeight: '600', color: '#0D1B2A' },
  quickGrid: { flexDirection: 'row', gap: 10 },
  quickCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  quickIcon: { fontSize: 24 },
  quickLabel: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
})
