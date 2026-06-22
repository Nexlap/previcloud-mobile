import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  Alert, Modal, Switch, Text, TouchableOpacity, View,
} from 'react-native'
import { logoutAccount } from '../../lib/api/profilo'
import { inviaSegnalazioneSettings } from '../../lib/api/settings'
import { caricaProfiloUtente } from '../../lib/api/profilo'
import { SegnalazioneForm, SettingsSegnalazioneModal } from './settings/SettingsSegnalazioneModal'
import { AppIcon } from './icons/AppIcon'
import { useTheme } from '../theme/ThemeContext'

type Props = {
  nomeBreve?: string
  email?: string
}

export function ProfileMenuButton({ nomeBreve: nomeProp, email: emailProp }: Props) {
  const { isDark, setDark, colors } = useTheme()
  const [menuAperto, setMenuAperto] = useState(false)
  const [nomeBreve, setNomeBreve] = useState(nomeProp || '...')
  const [email, setEmail] = useState(emailProp || '')
  const [iniziale, setIniziale] = useState('P')
  const [mostraSegnalazione, setMostraSegnalazione] = useState(false)
  const [segnalazione, setSegnalazione] = useState<SegnalazioneForm>({
    tipo: 'bug', titolo: '', descrizione: '', schermata: '',
  })
  const [inviandoSegnalazione, setInviandoSegnalazione] = useState(false)

  useEffect(() => {
    if (nomeProp) setNomeBreve(nomeProp.split(' ')[0] || nomeProp)
    if (emailProp) setEmail(emailProp)
  }, [nomeProp, emailProp])

  useEffect(() => {
    void caricaProfiloUtente().then(p => {
      if (!p) return
      const breve = p.nomeAzienda?.split(' ')[0] || p.nomeAzienda || 'Account'
      setNomeBreve(breve)
      setEmail(p.email)
      setIniziale(breve.charAt(0).toUpperCase() || 'P')
    })
  }, [])

  async function inviaSegnalazione() {
    if (!segnalazione.titolo.trim() || !segnalazione.descrizione.trim()) {
      Alert.alert('Campi obbligatori', 'Inserisci titolo e descrizione')
      return
    }
    setInviandoSegnalazione(true)
    const { error, user } = await inviaSegnalazioneSettings(segnalazione)
    setInviandoSegnalazione(false)
    if (!user) return
    if (error) {
      Alert.alert('Errore', 'Impossibile inviare la segnalazione')
      return
    }
    Alert.alert('Inviata', 'Grazie! Analizzeremo il problema il prima possibile.')
    setSegnalazione({ tipo: 'bug', titolo: '', descrizione: '', schermata: '' })
    setMostraSegnalazione(false)
  }

  async function esci() {
    setMenuAperto(false)
    Alert.alert('Logout', "Vuoi uscire dall'account?", [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Esci',
        style: 'destructive',
        onPress: async () => {
          await logoutAccount()
          router.replace('/(auth)/login')
        },
      },
    ])
  }

  function voceMenu(
    icon: Parameters<typeof AppIcon>[0]['name'],
    label: string,
    onPress: () => void,
    danger = false,
  ) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 }}
      >
        <AppIcon name={icon} size={18} color={danger ? '#DC2626' : colors.icon} />
        <Text style={{ fontSize: 14, color: danger ? '#DC2626' : colors.text, fontWeight: danger ? '600' : '400' }}>
          {label}
        </Text>
      </TouchableOpacity>
    )
  }

  return (
    <>
      <TouchableOpacity
        onPress={() => setMenuAperto(true)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingLeft: 4, paddingRight: 8 }}
      >
        <View style={{
          width: 40, height: 40, borderRadius: 20, backgroundColor: '#0E9F8E',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{iniziale}</Text>
        </View>
        <AppIcon name="chevron-down" size={16} color="#9CA3AF" />
      </TouchableOpacity>

      <Modal visible={menuAperto} transparent animationType="fade" onRequestClose={() => setMenuAperto(false)}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setMenuAperto(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {}}
            style={{
              position: 'absolute', top: 100, right: 16, left: 16,
              backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden',
              shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12,
              elevation: 8,
            }}
          >
            <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }} numberOfLines={1}>{nomeBreve}</Text>
              {email ? (
                <Text style={{ marginTop: 2, fontSize: 12, color: colors.textMuted }} numberOfLines={1}>{email}</Text>
              ) : null}
            </View>

            {voceMenu('user', 'Il mio profilo', () => { setMenuAperto(false); router.push('/screens/profilo') })}
            {voceMenu('settings', 'Impostazioni azienda', () => { setMenuAperto(false); router.push('/screens/settings') })}
            {voceMenu('percent', 'Regime fiscale', () => { setMenuAperto(false); router.push('/screens/fiscale') })}
            {voceMenu('smartphone', 'App e legalità', () => { setMenuAperto(false); router.push('/screens/profilo') })}
            {voceMenu('alert-triangle', 'Segnala un problema', () => { setMenuAperto(false); setMostraSegnalazione(true) })}

            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <AppIcon name="moon" size={18} color={colors.icon} />
                <Text style={{ fontSize: 14, color: colors.text }}>Tema scuro</Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={v => void setDark(v)}
                trackColor={{ false: '#D1D5DB', true: '#0E9F8E' }}
                thumbColor="#fff"
              />
            </View>

            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />

            {voceMenu('log-out', 'Esci dall\'account', () => void esci(), true)}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <SettingsSegnalazioneModal
        visible={mostraSegnalazione}
        segnalazione={segnalazione}
        inviando={inviandoSegnalazione}
        onClose={() => setMostraSegnalazione(false)}
        onChange={setSegnalazione}
        onInvia={() => void inviaSegnalazione()}
      />
    </>
  )
}
