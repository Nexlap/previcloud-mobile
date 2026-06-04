import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text, TouchableOpacity,
  View
} from 'react-native'
import { supabase } from '../../lib/supabase'

interface Profile {
  nome_azienda: string | null
  plan: string
}

interface Preventivo {
  id: string
  nome_cliente: string | null
  importo_totale: number | null
  stato: string
  created_at: string
  is_ultimo: boolean
  cliente_id: string | null
}

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [preventivi, setPreventivi] = useState<Preventivo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { carica() }, [])

  async function carica() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/(auth)/login'); return }

    const { data: prof } = await supabase
      .from('profiles').select('nome_azienda, plan').eq('id', user.id).single()
    if (prof) setProfile(prof)

   const { data: prevs } = await supabase
  .from('preventivi')
  .select('id, nome_cliente, importo_totale, stato, created_at, is_ultimo, cliente_id, clienti(nome)')
  .eq('user_id', user.id)
  .eq('is_ultimo', true)
  .order('created_at', { ascending: false })
  .limit(5)
if (prevs) setPreventivi(prevs.map((p: any) => ({
  ...p,
  nome_cliente: p.clienti?.nome || p.nome_cliente || 'Senza cliente'
})))

    setLoading(false)
  }

  async function logout() {
    await supabase.auth.signOut()
    router.replace('/(auth)/login')
  }

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#0E9F8E" />
    </View>
  )

  const nome = profile?.nome_azienda || 'Artigiano'
  const totale = preventivi.reduce((a, p) => a + (p.importo_totale || 0), 0)

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>Preventivo<Text style={styles.logoAccent}>AI</Text></Text>
          <Text style={styles.headerSub}>Ciao {nome} 👋</Text>
        </View>
        
 <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
  <TouchableOpacity onPress={() => router.push('/(tabs)/profilo')}>
    <Text style={{ fontSize: 22 }}>👤</Text>
  </TouchableOpacity>
  <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
    <Text style={styles.logoutText}>Esci</Text>
  </TouchableOpacity>
</View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{preventivi.length}</Text>
            <Text style={styles.statLabel}>Preventivi</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statVal, { color: '#0E9F8E' }]}>€{totale.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Valore totale</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{preventivi.length * 23}</Text>
            <Text style={styles.statLabel}>Min. risparmiate</Text>
          </View>
        </View>

<TouchableOpacity style={styles.ctaCard} onPress={() => router.push('/(tabs)/nuovo')}>
  <View style={styles.ctaIcon}>
    <Text style={styles.ctaIconText}>+</Text>
  </View>
  <View style={styles.ctaBody}>
    <Text style={styles.ctaTitle}>Nuovo preventivo</Text>
    <Text style={styles.ctaSub}>Voce, testo o builder manuale</Text>
  </View>
</TouchableOpacity>
<TouchableOpacity style={styles.clientiBtn} onPress={() => router.push('/(tabs)/clienti')}>
  <View style={styles.callIcon}>
    <Text style={styles.callIconText}>👥</Text>
  </View>
  <View style={styles.ctaBody}>
    <Text style={styles.ctaTitle}>Rubrica clienti</Text>
    <Text style={styles.ctaSub}>Gestisci i tuoi clienti e i loro preventivi</Text>
  </View>
</TouchableOpacity>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ultimi preventivi</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/storico')}>
              <Text style={styles.sectionLink}>Vedi tutti</Text>
            </TouchableOpacity>
          </View>
          {preventivi.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Nessun preventivo ancora.</Text>
            </View>
          ) : (
            preventivi.map(p => (
               <TouchableOpacity key={p.id} style={styles.prevRow}
    onPress={() => {
      if (p.cliente_id) {
        router.push({ pathname: '/(tabs)/cliente-dettaglio', params: { id: p.cliente_id, nome: p.nome_cliente || 'Cliente' } })
      }
    }}
  >
    <View style={styles.prevLeft}>
      <Text style={styles.prevCliente}>{p.nome_cliente || 'Senza cliente'}</Text>
      <Text style={styles.prevData}>{new Date(p.created_at).toLocaleDateString('it-IT')}</Text>
    </View>
    <View style={styles.prevRight}>
      <Text style={styles.prevImporto}>{p.importo_totale ? `€${p.importo_totale}` : '—'}</Text>
      <Text style={styles.prevStato}>{p.stato}</Text>
    </View>
  </TouchableOpacity>
))
          )}
        </View>

        <TouchableOpacity style={styles.settingsBtn} onPress={() => router.push('/(tabs)/settings')}>
          <Text style={styles.settingsText}>⚙️  Impostazioni profilo e listino</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F8FA' },
  header: { backgroundColor: '#0D1B2A', paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  logo: { fontSize: 20, fontWeight: '700', color: '#fff' },
  logoAccent: { color: '#2DD4BF' },
  headerSub: { fontSize: 14, color: '#9CA3AF', marginTop: 2 },
  logoutBtn: { padding: 8 },
  logoutText: { color: '#6B7280', fontSize: 13 },
  scroll: { flex: 1 },
  statsRow: { flexDirection: 'row', gap: 10, padding: 16 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  statVal: { fontSize: 22, fontWeight: '700', color: '#0D1B2A' },
  statLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  ctaCard: { margin: 16, marginTop: 0, backgroundColor: '#0D1B2A', borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
  ctaIcon: { width: 48, height: 48, backgroundColor: '#0E9F8E', borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  ctaIconText: { color: '#fff', fontSize: 28, fontWeight: '300' },
  ctaBody: { flex: 1 },
  ctaTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  ctaSub: { color: '#6B7280', fontSize: 13, marginTop: 2 },
  section: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#0D1B2A' },
  sectionLink: { fontSize: 13, color: '#0E9F8E' },
  emptyBox: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#9CA3AF' },
  prevRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  prevLeft: { flex: 1 },
  prevCliente: { fontSize: 14, fontWeight: '500', color: '#0D1B2A' },
  prevData: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  prevRight: { alignItems: 'flex-end' },
  prevImporto: { fontSize: 14, fontWeight: '600', color: '#0D1B2A' },
  prevStato: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  settingsBtn: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', padding: 16 },
  settingsText: { fontSize: 14, color: '#6B7280' },
  callCard: { marginHorizontal: 16, marginBottom: 16, backgroundColor: '#0E9F8E', borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
  callIcon: { width: 48, height: 48, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  callIconText: { fontSize: 24 },
  clientiBtn: { marginHorizontal: 16, marginBottom: 16, backgroundColor: '#fff', borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, borderWidth: 1, borderColor: '#E5E7EB' },
})