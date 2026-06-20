import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { eliminaMetodoPagamento, caricaMetodiPagamento, MetodoPagamento, MetodoPagamentoForm, salvaMetodoPagamento, TipoPagamento } from '../../lib/api/pagamenti'
import { statoAccount, StripeAccountStato } from '../../lib/api/stripeConnect'
import { StripeConnectCard } from '../../lib/components/settings/StripeConnectCard'
import { useScreenTheme } from '../../lib/hooks/useScreenTheme'

export default function Pagamenti() {
  const { colors, isDark, s } = useScreenTheme()
  const { stripeRefresh } = useLocalSearchParams<{ stripeRefresh?: string }>()
  const [metodi, setMetodi] = useState<MetodoPagamento[]>([])
  const [stripeStato, setStripeStato] = useState<StripeAccountStato | null>(null)
  const [caricandoStripe, setCaricandoStripe] = useState(true)
  const [modal, setModal] = useState(false)
  const [edit, setEdit] = useState<MetodoPagamento | null>(null)
  const [form, setForm] = useState<MetodoPagamentoForm>({ tipo: 'bonifico', nome: '', dati: {}, predefinito: false })
  const [saving, setSaving] = useState(false)

  useEffect(() => { carica() }, [])

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

  useFocusEffect(useCallback(() => {
    void caricaStripeStato()
  }, [caricaStripeStato]))

  useEffect(() => {
    if (stripeRefresh === '1') void caricaStripeStato()
  }, [stripeRefresh, caricaStripeStato])

  async function carica() {
    setMetodi(await caricaMetodiPagamento())
  }

  function nuovo() {
    setEdit(null)
    setForm({ tipo: 'bonifico', nome: '', dati: {}, predefinito: false })
    setModal(true)
  }

  function modifica(m: MetodoPagamento) {
    setEdit(m)
    setForm({ tipo: m.tipo, nome: m.nome, dati: m.dati || {}, predefinito: !!m.predefinito })
    setModal(true)
  }

  async function salva() {
    if (!form.nome.trim()) { Alert.alert('Errore', 'Inserisci un nome'); return }
    setSaving(true)
    const { error, user } = await salvaMetodoPagamento(form, edit?.id)
    if (!user) { setSaving(false); return }
    if (error) { setSaving(false); Alert.alert('Errore', error.message); return }
    setSaving(false)
    setModal(false)
    carica()
  }

  async function elimina(id: string) {
    Alert.alert('Elimina', 'Vuoi eliminare questo metodo?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: async () => {
        await eliminaMetodoPagamento(id)
        setMetodi(m => m.filter(x => x.id !== id))
      }}
    ])
  }

  function icon(tipo: TipoPagamento) {
    return tipo === 'bonifico' ? '🏦' : tipo === 'paypal' ? '💙' : tipo === 'contanti' ? '💵' : '💳'
  }

  return (
    <View style={s.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>←</Text></TouchableOpacity>
        <Text style={styles.title}>Metodi di pagamento</Text>
        <TouchableOpacity onPress={nuovo}><Text style={styles.add}>+</Text></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <StripeConnectCard
          stato={stripeStato}
          loading={caricandoStripe}
          onRefresh={caricaStripeStato}
          colors={colors}
          isDark={isDark}
        />
        {metodi.length === 0 ? (
          <TouchableOpacity style={[styles.empty, s.card]} onPress={nuovo}>
            <Text style={styles.emptyIcon}>💳</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Nessun metodo configurato</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>Tocca + per aggiungere bonifico, PayPal, contanti, carta o Stripe</Text>
          </TouchableOpacity>
        ) : metodi.map(m => (
          <View key={m.id} style={[styles.card, s.card]}>
            <Text style={styles.cardIcon}>{icon(m.tipo)}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{m.nome}</Text>
              {m.tipo === 'bonifico' && m.dati?.iban && <Text style={[styles.cardSub, { color: colors.textMuted }]}>{m.dati.iban}</Text>}
              {m.tipo === 'paypal' && m.dati?.email && <Text style={[styles.cardSub, { color: colors.textMuted }]}>{m.dati.email}</Text>}
              {m.predefinito && <Text style={styles.default}>predefinito</Text>}
            </View>
            <TouchableOpacity onPress={() => modifica(m)}><Text style={styles.action}>✏️</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => elimina(m.id)}><Text style={styles.action}>🗑</Text></TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <Modal visible={modal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: colors.bg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
            <TouchableOpacity onPress={() => setModal(false)}><Text style={[styles.close, { color: colors.textMuted }]}>✕</Text></TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{edit ? 'Modifica metodo' : 'Nuovo metodo'}</Text>
            <TouchableOpacity onPress={salva} disabled={saving}>{saving ? <ActivityIndicator color="#0E9F8E" /> : <Text style={styles.save}>Salva</Text>}</TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={[styles.label, { color: colors.textMuted }]}>TIPO</Text>
            <View style={styles.chips}>
              {[
                { key: 'bonifico', label: '🏦 Bonifico' },
                { key: 'paypal', label: '💙 PayPal' },
                { key: 'contanti', label: '💵 Contanti' },
                { key: 'carta', label: '💳 Carta' },
                { key: 'stripe', label: '🔗 Stripe link' },
              ].map(t => {
                const active = form.tipo === t.key
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
                    onPress={() => setForm(f => ({ ...f, tipo: t.key as TipoPagamento, dati: {} }))}
                  >
                    <Text style={[styles.chipText, active ? styles.chipTextActive : { color: colors.textMuted }]}>{t.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
            <Text style={[styles.label, { color: colors.textMuted }]}>NOME *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={form.nome}
              onChangeText={v => setForm(f => ({ ...f, nome: v }))}
              placeholder="es. Conto principale"
              placeholderTextColor={colors.textMuted}
            />
            {form.tipo === 'bonifico' && (
              <>
                <Text style={[styles.label, { color: colors.textMuted }]}>IBAN</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={form.dati?.iban || ''}
                  onChangeText={v => setForm(f => ({ ...f, dati: { ...f.dati, iban: v.toUpperCase() } }))}
                  autoCapitalize="characters"
                  placeholder="IT60..."
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={[styles.label, { color: colors.textMuted }]}>INTESTATARIO</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={form.dati?.intestatario || ''}
                  onChangeText={v => setForm(f => ({ ...f, dati: { ...f.dati, intestatario: v } }))}
                  placeholder="Mario Rossi"
                  placeholderTextColor={colors.textMuted}
                />
              </>
            )}
            {form.tipo === 'paypal' && (
              <>
                <Text style={[styles.label, { color: colors.textMuted }]}>EMAIL PAYPAL</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={form.dati?.email || ''}
                  onChangeText={v => setForm(f => ({ ...f, dati: { ...f.dati, email: v } }))}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="mail@example.com"
                  placeholderTextColor={colors.textMuted}
                />
              </>
            )}
            <TouchableOpacity
              style={[styles.defaultRow, { backgroundColor: isDark ? colors.surface : '#F7F8FA', borderWidth: 1, borderColor: colors.border }]}
              onPress={() => setForm(f => ({ ...f, predefinito: !f.predefinito }))}
            >
              <Text style={styles.defaultBox}>{form.predefinito ? '✓' : ''}</Text>
              <Text style={[styles.defaultText, { color: colors.text }]}>Imposta come predefinito</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#0D1B2A', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { color: '#9CA3AF', fontSize: 22, width: 40 },
  title: { color: '#fff', fontSize: 16, fontWeight: '600' },
  add: { color: '#0E9F8E', fontSize: 28, width: 40, textAlign: 'right' },
  content: { padding: 16, gap: 12 },
  empty: { borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1 },
  emptyIcon: { fontSize: 34 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginTop: 8 },
  emptySub: { fontSize: 13, textAlign: 'center', marginTop: 4 },
  card: { borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1 },
  cardIcon: { fontSize: 22 },
  cardTitle: { fontSize: 15, fontWeight: '600' },
  cardSub: { fontSize: 12, marginTop: 2 },
  default: { fontSize: 11, color: '#0E9F8E', fontWeight: '700', marginTop: 3 },
  action: { fontSize: 18, padding: 4 },
  modal: { flex: 1 },
  modalHeader: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1 },
  close: { fontSize: 22, width: 50 },
  modalTitle: { fontSize: 16, fontWeight: '700' },
  save: { fontSize: 15, color: '#0E9F8E', fontWeight: '700', width: 50, textAlign: 'right' },
  modalContent: { padding: 16, gap: 12 },
  label: { fontSize: 11, fontWeight: '700' },
  input: { borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, borderWidth: 1 },
  chipText: { fontSize: 13 },
  chipTextActive: { color: '#fff' },
  defaultRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12 },
  defaultBox: { width: 22, height: 22, borderRadius: 4, backgroundColor: '#0E9F8E', color: '#fff', textAlign: 'center', fontWeight: '700' },
  defaultText: { fontSize: 14, fontWeight: '500' },
})
