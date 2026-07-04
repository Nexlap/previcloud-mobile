import * as WebBrowser from 'expo-web-browser'
import { useFocusEffect } from 'expo-router'
import { useCallback } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AppIcon } from '../../lib/components/icons/AppIcon'
import { WEB_PRODOTTI_URL } from '../../lib/features/profilo/constants'
import { useScreenTheme } from '../../lib/hooks/useScreenTheme'
import { trackEvento } from '../../lib/utils/analytics'

export default function ProdottiDigitali() {
  const { colors, s } = useScreenTheme()

  useFocusEffect(useCallback(() => {
    trackEvento('prodotti_digitali_aperti', 'prodotti_digitali')
  }, []))

  async function apriWeb() {
    await WebBrowser.openBrowserAsync(WEB_PRODOTTI_URL)
  }

  return (
    <View style={s.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Prodotti digitali</Text>
        <View style={styles.betaBadge}>
          <Text style={styles.betaText}>BETA</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <AppIcon name="package" size={34} color="#0B7A6D" />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Vendi contenuti digitali</Text>
        <Text style={[styles.lead, { color: colors.textMuted }]}>
          Dal web puoi creare uno store personale per guide, template e file scaricabili. Condividi il
          link con i clienti: pagano con carta e ricevono subito il download.
        </Text>

        <View style={[styles.steps, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.step, { color: colors.text }]}>1. Crea il prodotto e imposta il prezzo</Text>
          <Text style={[styles.step, { color: colors.text }]}>2. Condividi il link del tuo store</Text>
          <Text style={[styles.step, { color: colors.text }]}>3. Incassi automaticamente con Stripe</Text>
        </View>

        <TouchableOpacity style={styles.cta} onPress={() => void apriWeb()} activeOpacity={0.88}>
          <Text style={styles.ctaText}>Vai a prodotti digitali sul web</Text>
          <AppIcon name="external-link" size={18} color="#fff" />
        </TouchableOpacity>

        <Text style={[styles.note, { color: colors.textMuted }]}>
          Si apre previcloud.it: accedi con le stesse credenziali dell'app.
        </Text>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#0D1B2A',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  betaBadge: {
    backgroundColor: '#0E9F8E',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  betaText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
    alignItems: 'center',
    gap: 14,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 4,
    shadowColor: '#0D1B2A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  lead: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 340,
  },
  steps: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
    marginTop: 4,
    shadowColor: '#0D1B2A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  step: {
    fontSize: 14,
    lineHeight: 20,
  },
  cta: {
    marginTop: 8,
    width: '100%',
    backgroundColor: '#0E9F8E',
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#0E9F8E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  ctaText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  note: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 300,
  },
})
