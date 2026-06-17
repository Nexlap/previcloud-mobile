import Constants from 'expo-constants'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View
} from 'react-native'
import { attivaBiometrico, biometriaConfigurata, caricaProfiloUtente, caricaStatoBiometrico, confermaConBiometria, disattivaBiometrico, logoutAccount, sessioneCorrente, verificaPasswordAccount } from '../../lib/api/profilo'
import { ProfiloAppCard } from '../../lib/components/profilo/ProfiloAppCard'
import { ProfiloAspettoCard } from '../../lib/components/profilo/ProfiloAspettoCard'
import { ProfiloAvatarCard } from '../../lib/components/profilo/ProfiloAvatarCard'
import { ProfiloHeader } from '../../lib/components/profilo/ProfiloHeader'
import { ProfiloNotificheCard } from '../../lib/components/profilo/ProfiloNotificheCard'
import { ProfiloPasswordModal } from '../../lib/components/profilo/ProfiloPasswordModal'
import { ProfiloSicurezzaCard } from '../../lib/components/profilo/ProfiloSicurezzaCard'
import { profiloStyles as styles } from '../../lib/components/profilo/profiloStyles'
import { errorMessage } from '../../lib/utils/errors'

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
      }},
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

  function chiudiModalPassword() {
    setModalPasswordElimina(false)
    setPasswordElimina('')
  }

  return (
    <View style={styles.container}>
      <ProfiloPasswordModal
        visible={modalPasswordElimina}
        password={passwordElimina}
        verificando={verificandoPassword}
        onChangePassword={setPasswordElimina}
        onClose={chiudiModalPassword}
        onConfirm={confermaPasswordEliminazione}
      />

      <ProfiloHeader onBack={() => router.back()} />

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <ProfiloAvatarCard
          nomeAzienda={nomeAzienda}
          email={email}
          onEditSettings={() => router.push('/screens/settings')}
        />

        <ProfiloSicurezzaCard
          biometricoDisponibile={biometricoDisponibile}
          biometricoAttivato={biometricoAttivato}
          onToggleBiometrico={toggleBiometrico}
        />

        <ProfiloAspettoCard />

        <ProfiloNotificheCard notifiche={notifiche} onChangeNotifiche={setNotifiche} />

        <ProfiloAppCard />

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
