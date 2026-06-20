import { router, useNavigation } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import type { EventArg, NavigationAction } from '@react-navigation/native'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { caricaSettingsData, salvaProfiloSettings } from '../../lib/api/settings'
import { MessaggiClienteEditor } from '../../lib/components/settings/MessaggiClienteEditor'
import { useScreenTheme } from '../../lib/hooks/useScreenTheme'
import {
  MESSAGGI_CLIENTE_DEFAULT,
  type MessaggiClienteTemplates,
} from 'preventivoai-shared'
import { caricaMessaggiCliente } from '../../lib/messaggiCliente'

type BeforeRemoveEvent = EventArg<'beforeRemove', true, { action: NavigationAction }>

export default function MessaggiClienteScreen() {
  const { colors, s } = useScreenTheme()
  const navigation = useNavigation()
  const [messaggi, setMessaggi] = useState<MessaggiClienteTemplates>(MESSAGGI_CLIENTE_DEFAULT)
  const [reminderGiorni, setReminderGiorni] = useState(3)
  const [reminderDisabilitato, setReminderDisabilitato] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modificheNonSalvate, setModificheNonSalvate] = useState(false)
  const messaggiRef = useRef(messaggi)
  const reminderRef = useRef({ giorni: reminderGiorni, disabilitato: reminderDisabilitato })
  useEffect(() => { messaggiRef.current = messaggi }, [messaggi])
  useEffect(() => { reminderRef.current = { giorni: reminderGiorni, disabilitato: reminderDisabilitato } }, [reminderGiorni, reminderDisabilitato])

  useEffect(() => {
    void Promise.all([caricaMessaggiCliente(true), caricaSettingsData()]).then(([msgData, settingsData]) => {
      setMessaggi(msgData)
      if (settingsData?.form) {
        setReminderGiorni(settingsData.form.reminder_firma_giorni)
        setReminderDisabilitato(settingsData.form.reminder_firma_globale_disabilitato)
      }
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: BeforeRemoveEvent) => {
      if (!modificheNonSalvate) return
      e.preventDefault()
      Alert.alert('Modifiche non salvate', 'Vuoi salvare le modifiche?', [
        {
          text: 'Abbandona',
          style: 'destructive',
          onPress: () => {
            setModificheNonSalvate(false)
            navigation.dispatch(e.data.action)
          },
        },
        { text: 'Continua', style: 'cancel' },
        {
          text: 'Salva',
          onPress: async () => {
            const ok = await salvaSilenzioso()
            if (ok) navigation.dispatch(e.data.action)
          },
        },
      ])
    })
    return unsubscribe
  }, [modificheNonSalvate, navigation])

  async function salvaSilenzioso(): Promise<boolean> {
    setSaving(true)
    const settingsData = await caricaSettingsData()
    if (!settingsData?.form) {
      setSaving(false)
      router.replace('/(auth)/login')
      return false
    }
    const { error, user } = await salvaProfiloSettings({
      ...settingsData.form,
      messaggi: messaggiRef.current,
      reminder_firma_giorni: reminderRef.current.giorni,
      reminder_firma_globale_disabilitato: reminderRef.current.disabilitato,
    })
    setSaving(false)
    if (!user) {
      router.replace('/(auth)/login')
      return false
    }
    if (error) {
      Alert.alert('Errore', error.message)
      return false
    }
    setModificheNonSalvate(false)
    return true
  }

  async function salva() {
    const ok = await salvaSilenzioso()
    if (ok) Alert.alert('Salvato', 'Comunicazione cliente aggiornata.')
  }

  function handleChange(next: MessaggiClienteTemplates) {
    setMessaggi(next)
    setModificheNonSalvate(true)
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#0E9F8E" />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Comunicazione cliente</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={[styles.sub, { color: colors.textMuted }]}>
          Personalizza messaggi WhatsApp ed email, template per la firma digitale e automazione dei reminder.
        </Text>

        <MessaggiClienteEditor
          messaggi={messaggi}
          onChange={handleChange}
          reminderGiorni={reminderGiorni}
          reminderDisabilitato={reminderDisabilitato}
          onReminderGiorniChange={v => { setReminderGiorni(v); setModificheNonSalvate(true) }}
          onReminderDisabilitatoChange={v => { setReminderDisabilitato(v); setModificheNonSalvate(true) }}
        />

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={() => void salva()}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Salva</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: '#0D1B2A',
  },
  back: { color: '#fff', fontSize: 22, width: 28 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '600', flex: 1, textAlign: 'center' as const },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  sub: { fontSize: 13, lineHeight: 19 },
  saveBtn: {
    backgroundColor: '#0D1B2A',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
})
