import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { MetodoPagamentoForm, TipoPagamento } from '../../api/pagamenti'
import { statoAccount, StripeAccountStato } from '../../api/stripeConnect'
import { StripeConnectCard } from '../settings/StripeConnectCard'
import { OnboardingStepper } from './OnboardingStepper'
import { onboardingStyles as styles } from './onboardingStyles'
import { useScreenTheme } from '../../hooks/useScreenTheme'

const TIPI: { key: TipoPagamento; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { key: 'bonifico', label: 'Bonifico', icon: 'bank' },
  { key: 'paypal', label: 'PayPal', icon: 'wallet-outline' },
  { key: 'contanti', label: 'Contanti', icon: 'cash' },
  { key: 'stripe', label: 'Stripe', icon: 'link-variant' },
]

const NOMI_DEFAULT: Record<TipoPagamento, string> = {
  bonifico: 'Bonifico bancario',
  paypal: 'PayPal',
  contanti: 'Contanti',
  carta: 'Carta',
  stripe: 'Pagamento online (Stripe)',
}

type Props = {
  stepMassimoRaggiunto: number
  form: MetodoPagamentoForm
  errore: string
  saving: boolean
  onFormChange: (form: MetodoPagamentoForm) => void
  onNavigate: (s: number) => void
  canNavigate: (s: number) => boolean
  onSkip: () => void
  onComplete: () => void
}

export function OnboardingPagamentoStep({
  stepMassimoRaggiunto,
  form,
  errore,
  saving,
  onFormChange,
  onNavigate,
  canNavigate,
  onSkip,
  onComplete,
}: Props) {
  const { colors, isDark } = useScreenTheme()
  const [tipoSelezionato, setTipoSelezionato] = useState<TipoPagamento | null>(null)
  const [stripeStato, setStripeStato] = useState<StripeAccountStato | null>(null)
  const [caricandoStripe, setCaricandoStripe] = useState(true)

  const caricaStripeStato = useCallback(async () => {
    setCaricandoStripe(true)
    try {
      setStripeStato(await statoAccount())
    } catch {
      setStripeStato(null)
    } finally {
      setCaricandoStripe(false)
    }
  }, [])

  useEffect(() => {
    void caricaStripeStato()
  }, [caricaStripeStato])

  function selezionaTipo(tipo: TipoPagamento) {
    setTipoSelezionato(tipo)
    onFormChange({
      tipo,
      nome: form.nome.trim() || NOMI_DEFAULT[tipo],
      dati: {},
      predefinito: true,
    })
  }

  return (
    <View style={styles.container}>
      <View style={styles.stepHeader}>
        <OnboardingStepper
          stepAttuale={5}
          stepMassimoRaggiunto={stepMassimoRaggiunto}
          onNavigate={onNavigate}
          canNavigate={canNavigate}
        />
      </View>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 16, backgroundColor: '#F7F8FA', flexGrow: 1 }}>
        <Text style={styles.stepTitle}>Metodo di pagamento predefinito</Text>
        <Text style={styles.stepSub}>
          Scegli come preferisci ricevere i pagamenti nei preventivi. Puoi saltare e configurarlo dopo.
        </Text>

        <Text style={[styles.label, { color: colors.textMuted }]}>TIPO</Text>
        <View style={styles.chipsRow}>
          {TIPI.map(t => {
            const active = tipoSelezionato === t.key
            return (
              <TouchableOpacity
                key={t.key}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? '#0D1B2A' : (isDark ? colors.bg : '#F7F8FA'),
                    borderColor: active ? '#0D1B2A' : colors.border,
                  },
                ]}
                onPress={() => selezionaTipo(t.key)}
              >
                <MaterialCommunityIcons name={t.icon} size={14} color={active ? '#fff' : colors.textMuted} />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {tipoSelezionato && (
          <>
            <Text style={[styles.label, { color: colors.textMuted }]}>NOME *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={form.nome}
              onChangeText={v => onFormChange({ ...form, nome: v })}
              placeholder="es. Conto principale"
              placeholderTextColor={colors.textMuted}
            />

            {form.tipo === 'bonifico' && (
              <>
                <Text style={[styles.label, { color: colors.textMuted }]}>IBAN</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={form.dati?.iban || ''}
                  onChangeText={v => onFormChange({ ...form, dati: { ...form.dati, iban: v.toUpperCase() } })}
                  autoCapitalize="characters"
                  placeholder="IT60..."
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={[styles.label, { color: colors.textMuted }]}>INTESTATARIO</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={form.dati?.intestatario || ''}
                  onChangeText={v => onFormChange({ ...form, dati: { ...form.dati, intestatario: v } })}
                  placeholder="Mario Rossi"
                  placeholderTextColor={colors.textMuted}
                />
              </>
            )}

            {form.tipo === 'paypal' && (
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={form.dati?.email || ''}
                onChangeText={v => onFormChange({ ...form, dati: { ...form.dati, email: v } })}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="Email PayPal"
                placeholderTextColor={colors.textMuted}
              />
            )}

            {form.tipo === 'stripe' && (
              <>
                <Text style={[styles.stepSub, { marginTop: 0 }]}>
                  Al momento della generazione PDF verrà creato un link Stripe Checkout per il cliente.
                </Text>
                <StripeConnectCard
                  stato={stripeStato}
                  loading={caricandoStripe}
                  onRefresh={caricaStripeStato}
                  colors={colors}
                  isDark={isDark}
                />
              </>
            )}

            {errore ? <Text style={{ color: '#DC2626', fontSize: 14 }}>{errore}</Text> : null}
          </>
        )}

        <TouchableOpacity
          style={[styles.skipBtn]}
          onPress={onSkip}
          disabled={saving}
        >
          <Text style={styles.skipBtnText}>Salta questo passaggio</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.nextBtn, (saving || !tipoSelezionato) && styles.nextBtnDisabled]}
          onPress={onComplete}
          disabled={saving || !tipoSelezionato}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.nextBtnText}>Salva e completa →</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}
