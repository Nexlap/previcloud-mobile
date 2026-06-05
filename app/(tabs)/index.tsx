import { useFocusEffect } from 'expo-router'
import { router } from 'expo-router'
import { useCallback, useState } from 'react'
import {
  ActivityIndicator, RefreshControl, ScrollView, StyleSheet,
  Text, TouchableOpacity, View
} from 'react-native'
import { supabase } from '../../lib/supabase'

interface Profile { nome_azienda: string | null; plan: string }
interface Preventivo {
  id: string; nome_cliente: string | null; importo_totale: number | null
  stato: string; created_at: string; is_ultimo: boolean; cliente_id: string | null
}

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [preventivi, setPreventivi] = useState<Preventivo[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useFocusEffect(useCallback(() => { carica() }, []))

  async function onRefresh() {
    setRefreshing(true)
    await carica()
    setRefreshing(false)
  }

  async function carica() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/(auth)/login'); return }
    const { data: prof } = await supabase.from('profiles').select('nome_azienda, plan').eq('id', user.id).single()
    if (prof) setProfile(prof)
    const { data: prevs } = await supabase
      .from('preventivi').select('id, nome_cliente, importo_totale, stato, created_at, is_ultimo, cliente_id, clienti(nome)')
      .eq('user_id', user.id).eq('is_ultimo', true).order('created_at', { ascending: false }).limit(5)
    if (prevs) setPreventivi(prevs.map((p: any) => ({
      ...p, nome_cliente: p.clienti?.nome || p.nome_cliente || 'Senza cliente'
    })))
    setLoading(false)
  }

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#0E9F8E" />
    </View>
  )

  const nome = profile?.nome_azienda?.split(' ')[0] || 'Artigiano'
  const totale = preventivi.reduce((a, p) => a + (p.importo_totale || 0), 0)
  const ora = new Date().getHours()
  const saluto = ora < 12 ? 'Buongiorno' : ora < 18 ? 'Buon pomeriggio' : 'Buonasera'

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.saluto}>{saluto},</Text>
          <Text style={styles.nome}>{nome} 👋</Text>
        </View>
        <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/(tabs)/profilo')}>
          <Text style={styles.profileBtnText}>{(nome || 'A').charAt(0).toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0E9F8E" colors={["#0E9F8E"]} />}>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{preventivi.length}</Text>
            <Text style={styles.statLabel}>Preventivi</Text>
          </View>
          <View style={[styles.statCard, styles.statCardAccent]}>
            <Text style={[styles.statVal, { color: '#fff' }]}>€{totale.toFixed(0)}</Text>
            <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.7)' }]}>Valore totale</Text>
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
              <TouchableOpacity key={p.id}
                style={[styles.prevRow, i === preventivi.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => {
                  if (p.cliente_id) router.push({ pathname: '/(tabs)/cliente-dettaglio', params: { id: p.cliente_id, nome: p.nome_cliente || 'Cliente' } })
                  else router.push('/(tabs)/storico')
                }}
              >
                <View style={styles.prevAvatar}>
                  <Text style={styles.prevAvatarText}>{(p.nome_cliente || 'S').charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.prevLeft}>
                  <Text style={styles.prevCliente}>{p.nome_cliente || 'Senza cliente'}</Text>
                  <Text style={styles.prevData}>{new Date(p.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}</Text>
                </View>
                <View style={styles.prevRight}>
                  <Text style={styles.prevImporto}>{p.importo_totale ? `€${p.importo_totale}` : '—'}</Text>
                  <View style={[styles.prevStatoBadge,
                    p.stato === 'accettato' ? styles.prevStatoAccettato :
                    p.stato === 'rifiutato' ? styles.prevStatoRifiutato :
                    p.stato === 'inviato' ? styles.prevStatoInviato : {}
                  ]}>
                    <Text style={styles.prevStatoText}>{p.stato}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Quick actions */}
        <Text style={styles.quickTitle}>Accesso rapido</Text>
        <View style={styles.quickGrid}>
          <TouchableOpacity style={styles.quickCard} onPress={() => router.push('/(tabs)/clienti')}>
            <Text style={styles.quickIcon}>👥</Text>
            <Text style={styles.quickLabel}>Clienti</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickCard} onPress={() => router.push('/(tabs)/builder')}>
            <Text style={styles.quickIcon}>📋</Text>
            <Text style={styles.quickLabel}>Builder</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickCard} onPress={() => router.push('/(tabs)/registra')}>
            <Text style={styles.quickIcon}>🎙</Text>
            <Text style={styles.quickLabel}>Registra</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickCard} onPress={() => router.push('/(tabs)/settings')}>
            <Text style={styles.quickIcon}>⚙️</Text>
            <Text style={styles.quickLabel}>Impostazioni</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F8FA' },
  header: { backgroundColor: '#0D1B2A', paddingTop: 60, paddingBottom: 24, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  saluto: { fontSize: 14, color: '#9CA3AF', fontWeight: '400' },
  nome: { fontSize: 22, fontWeight: '700', color: '#fff', marginTop: 2 },
  profileBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#0E9F8E', justifyContent: 'center', alignItems: 'center' },
  profileBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  scroll: { flex: 1 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  statCardAccent: { backgroundColor: '#0D1B2A', borderColor: '#0D1B2A' },
  statVal: { fontSize: 20, fontWeight: '700', color: '#0D1B2A' },
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
  prevStatoBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: '#F3F4F6' },
  prevStatoAccettato: { backgroundColor: '#D1FAE5' },
  prevStatoRifiutato: { backgroundColor: '#FEE2E2' },
  prevStatoInviato: { backgroundColor: '#DBEAFE' },
  prevStatoText: { fontSize: 10, color: '#6B7280', fontWeight: '500' },
  quickTitle: { fontSize: 15, fontWeight: '600', color: '#0D1B2A' },
  quickGrid: { flexDirection: 'row', gap: 10 },
  quickCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  quickIcon: { fontSize: 24 },
  quickLabel: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
})
