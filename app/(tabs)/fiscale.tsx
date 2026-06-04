import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import {
    ActivityIndicator, Alert, ScrollView, StyleSheet,
    Switch, Text, TextInput, TouchableOpacity, View
} from 'react-native'
import { supabase } from '../../lib/supabase'

type Regime = 'forfettario' | 'ordinario' | 'occasionale'

interface ProfiloFiscale {
  id?: string
  regime: Regime
  coefficiente_redditivita: string
  aliquota_sostitutiva: string
  inps_percentuale: string
  inps_tipo: string
  riduzione_contributiva: boolean
  riduzione_percentuale: string
  rivalsa_inps: boolean
  rivalsa_percentuale: string
  soglia_fatturato: string
  aliquota_iva: string
  costi_deducibili_percentuale: string
  ritenuta_acconto: string
  soglia_occasionale: string
}

const DEFAULT_PROFILO: ProfiloFiscale = {
  regime: 'forfettario',
  coefficiente_redditivita: '78',
  aliquota_sostitutiva: '15',
  inps_percentuale: '26.07',
  inps_tipo: 'gestione_separata',
  riduzione_contributiva: false,
  riduzione_percentuale: '35',
  rivalsa_inps: true,
  rivalsa_percentuale: '4',
  soglia_fatturato: '85000',
  aliquota_iva: '22',
  costi_deducibili_percentuale: '20',
  ritenuta_acconto: '20',
  soglia_occasionale: '5000',
}

export default function Fiscale() {
  const [profilo, setProfilo] = useState<ProfiloFiscale>(DEFAULT_PROFILO)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [featureAttiva, setFeatureAttiva] = useState(false)

  useEffect(() => { carica() }, [])

  async function carica() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('profili_fiscali').select('*').eq('user_id', user.id).single()
    if (data) {
      setProfilo({
        id: data.id,
        regime: data.regime,
        coefficiente_redditivita: data.coefficiente_redditivita?.toString() || '78',
        aliquota_sostitutiva: data.aliquota_sostitutiva?.toString() || '15',
        inps_percentuale: data.inps_percentuale?.toString() || '26.07',
        inps_tipo: data.inps_tipo || 'gestione_separata',
        riduzione_contributiva: data.riduzione_contributiva || false,
        riduzione_percentuale: data.riduzione_percentuale?.toString() || '35',
        rivalsa_inps: data.rivalsa_inps ?? true,
        rivalsa_percentuale: data.rivalsa_percentuale?.toString() || '4',
        soglia_fatturato: data.soglia_fatturato?.toString() || '85000',
        aliquota_iva: data.aliquota_iva?.toString() || '22',
        costi_deducibili_percentuale: data.costi_deducibili_percentuale?.toString() || '20',
        ritenuta_acconto: data.ritenuta_acconto?.toString() || '20',
        soglia_occasionale: data.soglia_occasionale?.toString() || '5000',
      })
      setFeatureAttiva(data.attivo ?? false)
    }
    setLoading(false)
  }

  async function salva() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const payload = {
      user_id: user.id,
      attivo: featureAttiva,
      regime: profilo.regime,
      coefficiente_redditivita: parseFloat(profilo.coefficiente_redditivita) || 78,
      aliquota_sostitutiva: parseFloat(profilo.aliquota_sostitutiva) || 15,
      inps_percentuale: parseFloat(profilo.inps_percentuale) || 26.07,
      inps_tipo: profilo.inps_tipo,
      riduzione_contributiva: profilo.riduzione_contributiva,
      riduzione_percentuale: parseFloat(profilo.riduzione_percentuale) || 35,
      rivalsa_inps: profilo.rivalsa_inps,
      rivalsa_percentuale: parseFloat(profilo.rivalsa_percentuale) || 4,
      soglia_fatturato: parseFloat(profilo.soglia_fatturato) || 85000,
      aliquota_iva: parseFloat(profilo.aliquota_iva) || 22,
      costi_deducibili_percentuale: parseFloat(profilo.costi_deducibili_percentuale) || 20,
      ritenuta_acconto: parseFloat(profilo.ritenuta_acconto) || 20,
      soglia_occasionale: parseFloat(profilo.soglia_occasionale) || 5000,
    }
    if (profilo.id) {
      await supabase.from('profili_fiscali').update(payload).eq('id', profilo.id)
    } else {
      const { data } = await supabase.from('profili_fiscali').insert(payload).select().single()
      if (data) setProfilo(p => ({ ...p, id: data.id }))
    }
    setSaving(false)
    Alert.alert('✓ Salvato', 'Profilo fiscale aggiornato.')
  }

  function set(key: keyof ProfiloFiscale, val: any) {
    setProfilo(p => ({ ...p, [key]: val }))
  }

  const Field = ({ label, field }: { label: string, field: keyof ProfiloFiscale }) => (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldInputWrap}>
        <TextInput
          style={styles.fieldInput}
          value={profilo[field] as string}
          onChangeText={v => set(field, v)}
          keyboardType="decimal-pad"
        />
        <Text style={styles.fieldUnit}>%</Text>
      </View>
    </View>
  )

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#0E9F8E" />
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Regime fiscale</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>

        {/* Toggle feature */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Analisi fiscale</Text>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Abilita analisi fiscale</Text>
              <Text style={styles.switchSub}>Mostra il calcolo del netto nel builder preventivo</Text>
            </View>
            <Switch
              value={featureAttiva}
              onValueChange={setFeatureAttiva}
              trackColor={{ false: '#E5E7EB', true: '#0E9F8E' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Selezione regime — visibile solo se feature attiva */}
        {featureAttiva && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Il tuo regime fiscale</Text>
              <Text style={styles.cardSub}>Usato per calcolare il netto nel builder preventivo</Text>
              {(['forfettario', 'ordinario', 'occasionale'] as Regime[]).map(r => (
                <TouchableOpacity
                  key={r}
                  style={[styles.regimeRow, profilo.regime === r && styles.regimeRowActive]}
                  onPress={() => set('regime', r)}
                >
                  <View style={styles.regimeLeft}>
                    <Text style={styles.regimeNome}>
                      {r === 'forfettario' ? '📋 Forfettario' : r === 'ordinario' ? '📊 Ordinario' : '🤝 Occasionale'}
                    </Text>
                    <Text style={styles.regimeSub}>
                      {r === 'forfettario' ? 'Imposta sostitutiva + INPS' : r === 'ordinario' ? 'IVA + IRPEF + INPS' : "Ritenuta d'acconto"}
                    </Text>
                  </View>
                  <View style={[styles.regimeCheck, profilo.regime === r && styles.regimeCheckActive]}>
                    {profilo.regime === r && <Text style={styles.regimeCheckText}>✓</Text>}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Parametri Forfettario */}
            {profilo.regime === 'forfettario' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Parametri forfettario</Text>
                <Field label="Coefficiente di redditività" field="coefficiente_redditivita" />
                <Field label="Imposta sostitutiva" field="aliquota_sostitutiva" />
                <Text style={styles.sectionLabel}>TIPO INPS</Text>
                <View style={styles.inpsTabs}>
                  {[
                    { key: 'gestione_separata', label: 'Gestione separata' },
                    { key: 'artigiani', label: 'Artigiani/Comm.' },
                  ].map(t => (
                    <TouchableOpacity
                      key={t.key}
                      style={[styles.inpsTab, profilo.inps_tipo === t.key && styles.inpsTabActive]}
                      onPress={() => set('inps_tipo', t.key)}
                    >
                      <Text style={[styles.inpsTabText, profilo.inps_tipo === t.key && styles.inpsTabTextActive]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Field label="Contributi INPS" field="inps_percentuale" />
                <View style={styles.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.switchLabel}>Riduzione contributiva</Text>
                    <Text style={styles.switchSub}>Agevolazione primi 3 anni (-35%)</Text>
                  </View>
                  <Switch value={profilo.riduzione_contributiva}
                    onValueChange={v => set('riduzione_contributiva', v)}
                    trackColor={{ false: '#E5E7EB', true: '#0E9F8E' }} thumbColor="#fff" />
                </View>
                {profilo.riduzione_contributiva && (
                  <Field label="Riduzione contributiva" field="riduzione_percentuale" />
                )}
                <View style={styles.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.switchLabel}>Rivalsa INPS in fattura</Text>
                    <Text style={styles.switchSub}>Aggiunge % al totale fattura</Text>
                  </View>
                  <Switch value={profilo.rivalsa_inps}
                    onValueChange={v => set('rivalsa_inps', v)}
                    trackColor={{ false: '#E5E7EB', true: '#0E9F8E' }} thumbColor="#fff" />
                </View>
                {profilo.rivalsa_inps && (
                  <Field label="Rivalsa INPS" field="rivalsa_percentuale" />
                )}
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Soglia massima fatturato</Text>
                  <View style={styles.fieldInputWrap}>
                    <TextInput style={styles.fieldInput} value={profilo.soglia_fatturato}
                      onChangeText={v => set('soglia_fatturato', v)} keyboardType="decimal-pad" />
                    <Text style={styles.fieldUnit}>€</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Parametri Ordinario */}
            {profilo.regime === 'ordinario' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Parametri ordinario</Text>
                <Field label="Aliquota IVA" field="aliquota_iva" />
                <Field label="Costi deducibili stimati" field="costi_deducibili_percentuale" />
                <Field label="INPS gestione separata" field="inps_percentuale" />
                <View style={styles.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.switchLabel}>Rivalsa INPS in fattura</Text>
                    <Text style={styles.switchSub}>4% aggiunto al totale fattura</Text>
                  </View>
                  <Switch value={profilo.rivalsa_inps}
                    onValueChange={v => set('rivalsa_inps', v)}
                    trackColor={{ false: '#E5E7EB', true: '#0E9F8E' }} thumbColor="#fff" />
                </View>
                {profilo.rivalsa_inps && (
                  <Field label="Rivalsa INPS" field="rivalsa_percentuale" />
                )}
                <Text style={styles.noteText}>
                  ℹ️ L'IRPEF viene calcolata automaticamente a scaglioni sul reddito imponibile
                </Text>
              </View>
            )}

            {/* Parametri Occasionale */}
            {profilo.regime === 'occasionale' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Parametri collaborazione occasionale</Text>
                <Field label="Ritenuta d'acconto" field="ritenuta_acconto" />
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Soglia esenzione contributi</Text>
                  <View style={styles.fieldInputWrap}>
                    <TextInput style={styles.fieldInput} value={profilo.soglia_occasionale}
                      onChangeText={v => set('soglia_occasionale', v)} keyboardType="decimal-pad" />
                    <Text style={styles.fieldUnit}>€</Text>
                  </View>
                </View>
              </View>
            )}
          </>
        )}

        {/* Disclaimer */}
        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerText}>
            ⚠️ I calcoli sono indicativi e a scopo informativo. Consulta sempre il tuo commercialista per decisioni fiscali.
          </Text>
        </View>

        <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={salva} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Salva regime fiscale</Text>}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#0D1B2A', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { padding: 4, width: 50 },
  backText: { color: '#9CA3AF', fontSize: 22 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', gap: 12 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#0D1B2A' },
  cardSub: { fontSize: 12, color: '#9CA3AF', marginTop: -8 },
  regimeRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F7F8FA' },
  regimeRowActive: { borderColor: '#0E9F8E', backgroundColor: '#F0FDF4' },
  regimeLeft: { flex: 1, gap: 2 },
  regimeNome: { fontSize: 14, fontWeight: '600', color: '#0D1B2A' },
  regimeSub: { fontSize: 11, color: '#9CA3AF' },
  regimeCheck: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
  regimeCheckActive: { backgroundColor: '#0E9F8E', borderColor: '#0E9F8E' },
  regimeCheckText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  sectionLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.8, marginTop: 4 },
  inpsTabs: { flexDirection: 'row', backgroundColor: '#F7F8FA', borderRadius: 10, padding: 3, borderWidth: 1, borderColor: '#E5E7EB' },
  inpsTab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' as const },
  inpsTabActive: { backgroundColor: '#0D1B2A' },
  inpsTabText: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  inpsTabTextActive: { color: '#fff' },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldLabel: { fontSize: 13, color: '#374151', flex: 1 },
  fieldInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fieldInput: { backgroundColor: '#F7F8FA', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', padding: 8, fontSize: 14, color: '#0D1B2A', width: 80, textAlign: 'center' as const, fontWeight: '600' as const },
  fieldUnit: { fontSize: 13, color: '#9CA3AF', width: 20 },
  switchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  switchLabel: { fontSize: 13, color: '#374151', fontWeight: '500' },
  switchSub: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  noteText: { fontSize: 12, color: '#6B7280', fontStyle: 'italic' as const, lineHeight: 18 },
  disclaimerBox: { backgroundColor: '#FFF7ED', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#FED7AA' },
  disclaimerText: { fontSize: 12, color: '#92400E', lineHeight: 18 },
  saveBtn: { backgroundColor: '#0D1B2A', borderRadius: 14, padding: 16, alignItems: 'center' as const },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
})