import * as WebBrowser from 'expo-web-browser'
import { useCallback, useState } from 'react'
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import {
  connettiAccount,
  creaOnboardingLink,
  StripeAccountStato,
  StripeOnboardingStatus,
} from '../../api/stripeConnect'
import { errorMessage } from '../../utils/errors'

type Props = {
  stato: StripeAccountStato | null
  loading: boolean
  onRefresh: () => Promise<void>
  colors: {
    text: string
    textMuted: string
    border: string
    surface: string
  }
  isDark: boolean
}

function labelStato(status: StripeOnboardingStatus): string {
  if (status === 'verificato') return 'Verificato'
  if (status === 'in_attesa') return 'In attesa verifica'
  return 'Non connesso'
}

export function StripeConnectCard({ stato, loading, onRefresh, colors, isDark }: Props) {
  const [aprendo, setAprendo] = useState(false)

  const apriOnboarding = useCallback(async (creaAccount: boolean) => {
    setAprendo(true)
    try {
      if (creaAccount) await connettiAccount()
      const { url } = await creaOnboardingLink()
      await WebBrowser.openBrowserAsync(url)
    } catch (err: unknown) {
      Alert.alert('Errore', errorMessage(err))
    } finally {
      setAprendo(false)
      await onRefresh()
    }
  }, [onRefresh])

  const status = stato?.stripe_onboarding_status ?? 'non_connesso'
  const verificato = status === 'verificato'

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>Stripe Connect</Text>
      <Text style={[styles.sub, { color: colors.textMuted }]}>
        Collega il tuo account Stripe per ricevere pagamenti online con carta
      </Text>

      {loading ? (
        <ActivityIndicator color="#0E9F8E" style={{ marginTop: 12 }} />
      ) : (
        <View style={[styles.statusRow, { backgroundColor: isDark ? colors.border : '#F7F8FA' }]}>
          <Text style={[styles.statusLabel, { color: colors.textMuted }]}>Stato</Text>
          <Text style={[styles.statusValue, { color: verificato ? '#0B7A6D' : colors.text }]}>
            {labelStato(status)}
          </Text>
        </View>
      )}

      {!loading && !verificato && status === 'non_connesso' && (
        <TouchableOpacity
          style={[styles.btn, aprendo && styles.btnDisabled]}
          onPress={() => void apriOnboarding(true)}
          disabled={aprendo}
        >
          {aprendo ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Connetti account Stripe</Text>
          )}
        </TouchableOpacity>
      )}

      {!loading && !verificato && status === 'in_attesa' && (
        <TouchableOpacity
          style={[styles.btn, aprendo && styles.btnDisabled]}
          onPress={() => void apriOnboarding(false)}
          disabled={aprendo}
        >
          {aprendo ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Continua verifica</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, padding: 14, borderWidth: 1, gap: 8 },
  title: { fontSize: 15, fontWeight: '700' },
  sub: { fontSize: 12, lineHeight: 18 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 10, padding: 10, marginTop: 4 },
  statusLabel: { fontSize: 12, fontWeight: '600' },
  statusValue: { fontSize: 13, fontWeight: '700' },
  btn: { backgroundColor: '#0D1B2A', borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 4 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
})
