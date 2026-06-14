import * as LocalAuthentication from 'expo-local-authentication'
import { router } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { useEffect, useState } from 'react'
import {
  Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View
} from 'react-native'
import { supabase } from "../../lib/supabase"

const NAVY = '#0D1B2A'
const TEAL = '#0E9F8E'
const GRAY = '#F7F8FA'
const BORDER = '#E5E7EB'
const TEXT = '#0D1B2A'
const MUTED = '#9CA3AF'

const PIANI = [
  { id: 'free', nome: 'Free', prezzo: '€0/mese', colore: '6B7280' },
  { id: 'pro', nome: 'Pro', prezzo: '€9.99/mese', colore: '0E9F8E' },
  { id: 'business', nome: 'Business', prezzo: '€19.99/mese', colore: '7C3AED' },
]

export default function Profilo() {
  const [nomeAzienda, setNomeAzienda] = useState('')
  const [email, setEmail] = useState('')
  const [biometricoAttivato, setBiometricoAttivato] = useState(false)
  const [biometricoDisponibile, setBiometricoDisponibile] = useState(false)
  const [pianoAttuale] = useState('free')
  const [notifiche, setNotifiche] = useState(true)

  useEffect(() => { carica() }, [])

  async function carica() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setEmail(user.email || '')
    const { data } = await supabase.from('profiles').select('nome_azienda').eq('id', user.id).single()
    if (data?.nome_azienda) setNomeAzienda(data.nome_azienda)
    const disponibile = await LocalAuthentication.hasHardwareAsync()
    const enrollato = await LocalAuthentication.isEnrolledAsync()
    setBiometricoDisponibile(disponibile && enrollato)
    const attivato = await SecureStore.getItemAsync('biometrico_attivato')
    setBiometricoAttivato(attivato === 'true')
  }

  async function toggleBiometrico(val: boolean) {
    if (val) {
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Conferma per attivare' })
      if (result.success) {
        await SecureStore.setItemAsync('biometrico_attivato', 'true')
        setBiometricoAttivato(true)
      }
    } else {
      await SecureStore.deleteItemAsync('biometrico_attivato')
      await SecureStore.deleteItemAsync('saved_email')
      await SecureStore.deleteItemAsync('saved_password')
      setBiometricoAttivato(false)
    }
  }

  async function logout() {
    Alert.alert('Logout', "Vuoi uscire dall'account?", [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Esci', style: 'destructive', onPress: async () => {
        await supabase.auth.signOut()
        router.replace('/(auth)/login')
      }}
    ])
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profilo</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>

        {/* Avatar */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{nomeAzienda.charAt(0).toUpperCase() || '?'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{nomeAzienda || 'Nome azienda'}</Text>
            <Text style={styles.profileEmail}>{email}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/screens/settings')}>
            <Text style={{ fontSize: 20 }}>✏️</Text>
          </TouchableOpacity>
        </View>

        {/* Piano */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Piano abbonamento</Text>
          <Text style={styles.cardSub}>Il tuo piano attuale</Text>
          {PIANI.map(piano => (
            <View key={piano.id} style={[styles.pianoRow, piano.id === pianoAttuale && styles.pianoRowActive]}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[styles.pianoNome, { color: `#${piano.colore}` }]}>{piano.nome}</Text>
                  {piano.id === pianoAttuale && (
                    <View style={[styles.pianoBadge, { backgroundColor: `#${piano.colore}20` }]}>
                      <Text style={[styles.pianoBadgeText, { color: `#${piano.colore}` }]}>Attuale</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.pianoPrezzo}>{piano.prezzo}</Text>
              </View>
              {piano.id !== pianoAttuale && (
                <TouchableOpacity
                  style={[styles.upgradeBtn, { borderColor: `#${piano.colore}` }]}
                  onPress={() => Alert.alert('Prossimamente', 'Gli abbonamenti saranno disponibili a breve!')}
                >
                  <Text style={[styles.upgradeBtnText, { color: `#${piano.colore}` }]}>Upgrade</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Sicurezza */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sicurezza</Text>
          {biometricoDisponibile && (
            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Accesso biometrico</Text>
                <Text style={styles.settingDesc}>Impronta digitale o Face ID</Text>
              </View>
              <Switch
                value={biometricoAttivato}
                onValueChange={toggleBiometrico}
                trackColor={{ false: BORDER, true: TEAL }}
                thumbColor="#fff"
              />
            </View>
          )}
          <TouchableOpacity
            style={styles.settingBtn}
            onPress={() => Alert.alert('Prossimamente', 'Il cambio password sarà disponibile a breve.')}
          >
            <Text style={styles.settingBtnText}>🔑 Cambia password</Text>
            <Text style={styles.settingBtnArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Aspetto */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Aspetto</Text>
          <View style={styles.settingBtn}>
            <Text style={styles.settingBtnText}>🎨 Tema scuro</Text>
            <Text style={styles.settingDesc}>Prossimamente</Text>
          </View>
        </View>

        {/* Notifiche */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Notifiche</Text>
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Notifiche push</Text>
              <Text style={styles.settingDesc}>Promemoria e aggiornamenti</Text>
            </View>
            <Switch
              value={notifiche}
              onValueChange={setNotifiche}
              trackColor={{ false: BORDER, true: TEAL }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Info app */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>App</Text>
          <TouchableOpacity
            style={styles.settingBtn}
            onPress={() => Alert.alert('Termini di servizio', 'Disponibili su preventivoai.it/termini')}
          >
            <Text style={styles.settingBtnText}>📄 Termini di servizio</Text>
            <Text style={styles.settingBtnArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingBtn}
            onPress={() => Alert.alert('Privacy Policy', 'Disponibile su preventivoai.it/privacy')}
          >
            <Text style={styles.settingBtnText}>🔒 Privacy Policy</Text>
            <Text style={styles.settingBtnArrow}>›</Text>
          </TouchableOpacity>
          <View style={styles.settingBtn}>
            <Text style={styles.settingBtnText}>📱 Versione app</Text>
            <Text style={styles.settingDesc}>0.4.0</Text>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Esci dall'account</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: GRAY },
  header: { backgroundColor: NAVY, paddingTop: 56, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { padding: 4, width: 50 },
  backText: { color: '#9CA3AF', fontSize: 22 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  profileCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDER, flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: NAVY, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: '700' },
  profileName: { fontSize: 17, fontWeight: '700', color: TEXT },
  profileEmail: { fontSize: 13, color: MUTED, marginTop: 2 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDER, gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: TEXT },
  cardSub: { fontSize: 12, color: MUTED },
  pianoRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: BORDER },
  pianoRowActive: { backgroundColor: '#F0FDF4', borderColor: TEAL },
  pianoNome: { fontSize: 14, fontWeight: '700' },
  pianoPrezzo: { fontSize: 12, color: MUTED, marginTop: 2 },
  pianoBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  pianoBadgeText: { fontSize: 10, fontWeight: '600' },
  upgradeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1.5 },
  upgradeBtnText: { fontSize: 12, fontWeight: '600' },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  settingLabel: { fontSize: 14, color: TEXT, fontWeight: '500' },
  settingDesc: { fontSize: 12, color: MUTED, marginTop: 1 },
  settingBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: BORDER },
  settingBtnText: { fontSize: 14, color: TEXT },
  settingBtnArrow: { fontSize: 18, color: MUTED },
  logoutBtn: { backgroundColor: '#FEE2E2', borderRadius: 14, padding: 16, alignItems: 'center' as const },
  logoutText: { color: '#EF4444', fontSize: 15, fontWeight: '600' },
})
