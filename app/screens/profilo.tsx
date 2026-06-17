import Constants from 'expo-constants'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View
} from 'react-native'
import { attivaBiometrico, biometriaConfigurata, caricaProfiloUtente, caricaStatoBiometrico, confermaConBiometria, disattivaBiometrico, logoutAccount, sessioneCorrente, verificaPasswordAccount } from '../../lib/api/profilo'
import { errorMessage } from '../../lib/utils/errors'

const NAVY = '#0D1B2A'
const TEAL = '#0E9F8E'
const GRAY = '#F7F8FA'
const BORDER = '#E5E7EB'
const TEXT = '#0D1B2A'
const MUTED = '#9CA3AF'

export default function Profilo() {
  const [nomeAzienda, setNomeAzienda] = useState('')
  const [email, setEmail] = useState('')
  const [biometricoAttivato, setBiometricoAttivato] = useState(false)
  const [biometricoDisponibile, setBiometricoDisponibile] = useState(false)
  const [notifiche, setNotifiche] = useState(true)
  const [eliminandoAccount, setEliminandoAccount] = useState(false)
  const [modalPasswordElimina, setModalPasswordElimina] = useState(false)
  const [passwordElimina, setPasswordElimina] = useState('')
  const [verificandoPassword, setVerificandoPassword] = useState(false)
  const backendUrl = Constants.expoConfig?.extra?.backendUrl

  useEffect(() => { carica() }, [])

  async function carica() {
    const profilo = await caricaProfiloUtente()
    if (!profilo) return
    setEmail(profilo.email)
    if (profilo.nomeAzienda) setNomeAzienda(profilo.nomeAzienda)
    const biometrico = await caricaStatoBiometrico()
    setBiometricoDisponibile(biometrico.disponibile)
    setBiometricoAttivato(biometrico.attivato)
  }

  async function toggleBiometrico(val: boolean) {
    if (val) {
      const success = await attivaBiometrico('Conferma per attivare')
      if (success) setBiometricoAttivato(true)
    } else {
      await disattivaBiometrico()
      setBiometricoAttivato(false)
    }
  }

  async function logout() {
    Alert.alert('Logout', "Vuoi uscire dall'account?", [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Esci', style: 'destructive', onPress: async () => {
        await logoutAccount()
        router.replace('/(auth)/login')
      }}
    ])
  }

  async function eliminaAccountConfermato() {
    setEliminandoAccount(true)
    try {
      if (!backendUrl) {
        Alert.alert('Errore', 'Backend non configurato.')
        setEliminandoAccount(false)
        return
      }

      const session = await sessioneCorrente()
      if (!session) {
        Alert.alert('Errore', 'Sessione non valida. Effettua di nuovo il login.')
        setEliminandoAccount(false)
        return
      }

      const res = await fetch(`${backendUrl}/api/elimina-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Impossibile eliminare account')

      await logoutAccount()
      router.replace('/(auth)/login')
    } catch (err: unknown) {
      Alert.alert('Errore', errorMessage(err, 'Impossibile eliminare account'))
      setEliminandoAccount(false)
    }
  }

  async function richiediAutenticazioneEliminazione() {
    if (await biometriaConfigurata()) {
      const result = await confermaConBiometria({
        promptMessage: 'Conferma eliminazione account',
        cancelLabel: 'Annulla',
        disableDeviceFallback: true,
      })

      if (result.success) eliminaAccountConfermato()
      return
    }

    setPasswordElimina('')
    setModalPasswordElimina(true)
  }

  async function confermaPasswordEliminazione() {
    const passwordPulita = passwordElimina.trim()
    if (!passwordPulita) {
      Alert.alert('Password richiesta', 'Inserisci la password attuale.')
      return
    }

    setVerificandoPassword(true)
    const { error } = await verificaPasswordAccount(email, passwordPulita)
    setVerificandoPassword(false)

    if (error) {
      Alert.alert('Errore', 'Password non corretta.')
      return
    }

    setModalPasswordElimina(false)
    setPasswordElimina('')
    eliminaAccountConfermato()
  }

  function eliminaAccount() {
    Alert.alert(
      'Elimina account',
      'Questa azione è irreversibile. Tutti i tuoi dati (preventivi, clienti, servizi, PDF) verranno eliminati permanentemente. Vuoi continuare?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Continua',
          style: 'destructive',
          onPress: () => Alert.alert(
            'Conferma finale',
            'Sei assolutamente sicuro? Non potrai recuperare i dati.',
            [
              { text: 'Annulla', style: 'cancel' },
              { text: 'Elimina account', style: 'destructive', onPress: richiediAutenticazioneEliminazione },
            ]
          ),
        },
      ]
    )
  }

  return (
    <View style={styles.container}>
      <Modal
        visible={modalPasswordElimina}
        transparent
        animationType="fade"
        onRequestClose={() => setModalPasswordElimina(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.passwordModal}>
            <Text style={styles.passwordModalTitle}>Conferma identita</Text>
            <Text style={styles.passwordModalDesc}>
              Inserisci la password attuale per eliminare definitivamente l'account.
            </Text>
            <TextInput
              style={styles.passwordModalInput}
              value={passwordElimina}
              onChangeText={setPasswordElimina}
              placeholder="Password attuale"
              placeholderTextColor={MUTED}
              secureTextEntry
              autoCapitalize="none"
            />
            <View style={styles.passwordModalActions}>
              <TouchableOpacity
                style={styles.passwordCancelBtn}
                onPress={() => {
                  setModalPasswordElimina(false)
                  setPasswordElimina('')
                }}
                disabled={verificandoPassword}
              >
                <Text style={styles.passwordCancelText}>Annulla</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.passwordConfirmBtn, verificandoPassword && styles.deleteAccountBtnDisabled]}
                onPress={confermaPasswordEliminazione}
                disabled={verificandoPassword}
              >
                {verificandoPassword
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.passwordConfirmText}>Conferma</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

        <TouchableOpacity
          style={[styles.deleteAccountBtn, eliminandoAccount && styles.deleteAccountBtnDisabled]}
          onPress={eliminaAccount}
          disabled={eliminandoAccount}
        >
          {eliminandoAccount
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.deleteAccountText}>Elimina account</Text>
          }
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
  deleteAccountBtn: { backgroundColor: '#DC2626', borderRadius: 14, padding: 16, alignItems: 'center' as const },
  deleteAccountBtnDisabled: { opacity: 0.6 },
  deleteAccountText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(13, 27, 42, 0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  passwordModal: { width: '100%', backgroundColor: '#fff', borderRadius: 18, padding: 20, borderWidth: 1, borderColor: BORDER },
  passwordModalTitle: { fontSize: 17, fontWeight: '700', color: TEXT },
  passwordModalDesc: { fontSize: 13, color: MUTED, lineHeight: 19, marginTop: 6, marginBottom: 16 },
  passwordModalInput: { backgroundColor: GRAY, borderRadius: 12, borderWidth: 1.5, borderColor: BORDER, padding: 12, fontSize: 14, color: TEXT },
  passwordModalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  passwordCancelBtn: { flex: 1, borderRadius: 12, padding: 13, alignItems: 'center' as const, backgroundColor: GRAY, borderWidth: 1, borderColor: BORDER },
  passwordCancelText: { color: TEXT, fontSize: 14, fontWeight: '600' },
  passwordConfirmBtn: { flex: 1, borderRadius: 12, padding: 13, alignItems: 'center' as const, backgroundColor: '#DC2626' },
  passwordConfirmText: { color: '#fff', fontSize: 14, fontWeight: '700' },
})
