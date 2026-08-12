import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View
} from 'react-native'
import { attivaBiometrico, aggiornaPasswordAccount, biometriaConfigurata, caricaProfiloUtente, caricaStatoBiometrico, confermaConBiometria, disattivaBiometrico, eliminaAccount, logoutAccount, verificaPasswordAccount } from '../../lib/api/profilo'
import { AbbonamentoCard } from '../../lib/components/profilo/AbbonamentoCard'
import { ProfiloAppCard } from '../../lib/components/profilo/ProfiloAppCard'
import { ProfiloAvatarCard } from '../../lib/components/profilo/ProfiloAvatarCard'
import { ProfiloCambiaPasswordModal } from '../../lib/components/profilo/ProfiloCambiaPasswordModal'
import { ProfiloFeedbackCard } from '../../lib/components/profilo/ProfiloFeedbackCard'
import { ProfiloHeader } from '../../lib/components/profilo/ProfiloHeader'
import { ProfiloNotificheCard } from '../../lib/components/profilo/ProfiloNotificheCard'
import { ProfiloPasswordModal } from '../../lib/components/profilo/ProfiloPasswordModal'
import { ProfiloSicurezzaCard } from '../../lib/components/profilo/ProfiloSicurezzaCard'
import { SegnalazioneForm, SettingsSegnalazioneModal } from '../../lib/components/settings/SettingsSegnalazioneModal'
import { inviaSegnalazioneSettings } from '../../lib/api/settings'
import { profiloStyles as styles } from '../../lib/components/profilo/profiloStyles'
import { errorMessage } from '../../lib/utils/errors'

export default function Profilo() {
  const [nomeAzienda, setNomeAzienda] = useState('')
  const [email, setEmail] = useState('')
  const [plan, setPlan] = useState<string | null>(null)
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null)
  const [biometricoAttivato, setBiometricoAttivato] = useState(false)
  const [biometricoDisponibile, setBiometricoDisponibile] = useState(false)
  const [notifiche, setNotifiche] = useState(true)
  const [eliminandoAccount, setEliminandoAccount] = useState(false)
  const [modalPasswordElimina, setModalPasswordElimina] = useState(false)
  const [passwordElimina, setPasswordElimina] = useState('')
  const [verificandoPassword, setVerificandoPassword] = useState(false)
  const [modalCambiaPassword, setModalCambiaPassword] = useState(false)
  const [passwordAttuale, setPasswordAttuale] = useState('')
  const [passwordNuova, setPasswordNuova] = useState('')
  const [passwordConferma, setPasswordConferma] = useState('')
  const [salvandoPassword, setSalvandoPassword] = useState(false)
  const [mostraSegnalazione, setMostraSegnalazione] = useState(false)
  const [segnalazione, setSegnalazione] = useState<SegnalazioneForm>({ tipo: 'bug', titolo: '', descrizione: '', schermata: '' })
  const [inviandoSegnalazione, setInviandoSegnalazione] = useState(false)

  useEffect(() => { carica() }, [])

  async function carica() {
    const profilo = await caricaProfiloUtente()
    if (!profilo) return
    setEmail(profilo.email)
    if (profilo.nomeAzienda) setNomeAzienda(profilo.nomeAzienda)
    setPlan(profilo.plan)
    setTrialEndsAt(profilo.trialEndsAt)
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
      await eliminaAccount()
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

  function apriModalCambiaPassword() {
    setPasswordAttuale('')
    setPasswordNuova('')
    setPasswordConferma('')
    setModalCambiaPassword(true)
  }

  function chiudiModalCambiaPassword() {
    setModalCambiaPassword(false)
    setPasswordAttuale('')
    setPasswordNuova('')
    setPasswordConferma('')
  }

  async function confermaCambioPassword() {
    const attuale = passwordAttuale.trim()
    const nuova = passwordNuova.trim()
    const conferma = passwordConferma.trim()

    if (!attuale) {
      Alert.alert('Password richiesta', 'Inserisci la password attuale.')
      return
    }
    if (nuova.length < 6) {
      Alert.alert('Password troppo corta', 'La nuova password deve avere almeno 6 caratteri.')
      return
    }
    if (nuova !== conferma) {
      Alert.alert('Password non coincidenti', 'La conferma non corrisponde alla nuova password.')
      return
    }
    if (nuova === attuale) {
      Alert.alert('Password uguale', 'La nuova password deve essere diversa da quella attuale.')
      return
    }

    setSalvandoPassword(true)
    const { error: erroreVerifica } = await verificaPasswordAccount(email, attuale)
    if (erroreVerifica) {
      setSalvandoPassword(false)
      Alert.alert('Errore', 'Password attuale non corretta.')
      return
    }

    const { error } = await aggiornaPasswordAccount(nuova)
    setSalvandoPassword(false)

    if (error) {
      Alert.alert('Errore', error.message)
      return
    }

    chiudiModalCambiaPassword()
    Alert.alert('Password aggiornata', 'La tua password è stata cambiata con successo.')
  }

  async function inviaSegnalazione(form: SegnalazioneForm) {
    if (!form.titolo.trim() || !form.descrizione.trim()) {
      Alert.alert('Campi obbligatori', 'Inserisci titolo e descrizione')
      return
    }
    setInviandoSegnalazione(true)
    const { error, user } = await inviaSegnalazioneSettings(form)
    setInviandoSegnalazione(false)
    if (!user) return
    if (error) { Alert.alert('Errore', 'Impossibile inviare la segnalazione'); return }
    Alert.alert('Inviata', 'Grazie! Analizzeremo il problema il prima possibile.')
    setSegnalazione({ tipo: 'bug', titolo: '', descrizione: '', schermata: '' })
    setMostraSegnalazione(false)
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

      <ProfiloCambiaPasswordModal
        visible={modalCambiaPassword}
        passwordAttuale={passwordAttuale}
        passwordNuova={passwordNuova}
        passwordConferma={passwordConferma}
        salvando={salvandoPassword}
        onChangePasswordAttuale={setPasswordAttuale}
        onChangePasswordNuova={setPasswordNuova}
        onChangePasswordConferma={setPasswordConferma}
        onClose={chiudiModalCambiaPassword}
        onConfirm={confermaCambioPassword}
      />

      <ProfiloHeader onBack={() => router.back()} />

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <ProfiloAvatarCard
          nomeAzienda={nomeAzienda}
          email={email}
          onEditSettings={() => router.push('/screens/settings')}
        />

        <AbbonamentoCard plan={plan} trialEndsAt={trialEndsAt} />

        <ProfiloSicurezzaCard
          biometricoDisponibile={biometricoDisponibile}
          biometricoAttivato={biometricoAttivato}
          onToggleBiometrico={toggleBiometrico}
          onCambiaPassword={apriModalCambiaPassword}
        />

        <ProfiloFeedbackCard onSegnala={() => setMostraSegnalazione(true)} />

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

      <SettingsSegnalazioneModal
        visible={mostraSegnalazione}
        segnalazione={segnalazione}
        inviando={inviandoSegnalazione}
        onClose={() => setMostraSegnalazione(false)}
        onChange={setSegnalazione}
        onInvia={(form) => void inviaSegnalazione(form)}
      />
    </View>
  )
}
