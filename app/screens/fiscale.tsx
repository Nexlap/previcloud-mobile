import { router, useNavigation } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import type { EventArg, NavigationAction } from '@react-navigation/native'
import {
    ActivityIndicator, Alert, ScrollView, StyleSheet,
    Switch, Text, TextInput, TouchableOpacity, View
} from 'react-native'
import { caricaProfiloFiscale, salvaProfiloFiscale } from '../../lib/api/fiscale'
import { trackEvento } from '../../lib/api/track'

type BeforeRemoveEvent = EventArg<'beforeRemove', true, { action: NavigationAction }>

type Regime = 'forfettario' | 'ordinario' | 'occasionale'
type ProfiloFiscaleValue = string | boolean | Regime

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

function FiscaleNumericField({
  label,
  value,
  unit,
  onChangeText,
}: {
  label: string
  value: string
  unit: string
  onChangeText: (v: string) => void
}) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldInputWrap}>
        <TextInput
          style={styles.fieldInput}
          value={value}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
        />
        <Text style={styles.fieldUnit}>{unit}</Text>
      </View>
    </View>
  )
}

export default function Fiscale() {
  const navigation = useNavigation()
  const [profilo, setProfilo] = useState<ProfiloFiscale>(DEFAULT_PROFILO)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [featureAttiva, setFeatureAttiva] = useState(false)
  const [modificheNonSalvate, setModificheNonSalvate] = useState(false)
  const profiloRef = useRef(profilo)
  const featureAttivaRef = useRef(featureAttiva)
  useEffect(() => { profiloRef.current = profilo }, [profilo])
  useEffect(() => { featureAttivaRef.current = featureAttiva }, [featureAttiva])

  useEffect(() => { trackEvento('schermata_aperta', 'fiscale') }, [])
  useEffect(() => { carica() }, [])

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: BeforeRemoveEvent) => {
      if (!modificheNonSalvate) return
      e.preventDefault()
      Alert.alert('Modifiche non salvate', 'Vuoi salvare le modifiche al profilo fiscale?', [
        { text: 'Abbandona', style: 'destructive', onPress: () => { setModificheNonSalvate(false); navigation.dispatch(e.data.action) } },
        { text: 'Continua', style: 'cancel' },
        { text: 'Salva', onPress: async () => {
          const id = await salvaProfiloFiscale(profiloRef.current, featureAttivaRef.current)
          if (id) profiloRef.current = { ...profiloRef.current, id }
          setModificheNonSalvate(false)
          navigation.dispatch(e.data.action)
        }},
      ])
    })
    return unsubscribe
  }, [modificheNonSalvate, navigation])

  async function carica() {
    const data = await caricaProfiloFiscale()
    if (data) {
      setProfilo(data.profilo as ProfiloFiscale)
      setFeatureAttiva(data.featureAttiva)
    }
    setLoading(false)
  }

  async function salva() {
    setSaving(true)
    const id = await salvaProfiloFiscale(profilo, featureAttiva)
    if (id) setProfilo(p => ({ ...p, id }))
    setSaving(false)
    setModificheNonSalvate(false)
    Alert.alert('✓ Salvato', 'Profilo fiscale aggiornato.')
  }

  function set(key: keyof ProfiloFiscale, val: ProfiloFiscaleValue) {
    setProfilo(p => ({ ...p, [key]: val }))
    setModificheNonSalvate(true)
  }

  function onFeatureAttivaChange(value: boolean) {
    setFeatureAttiva(value)
    setModificheNonSalvate(true)
  }

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

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">

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
              onValueChange={onFeatureAttivaChange}
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
                <FiscaleNumericField label="Coefficiente di redditività" value={profilo.coefficiente_redditivita} unit="%" onChangeText={v => set('coefficiente_redditivita', v)} />
                <FiscaleNumericField label="Imposta sostitutiva" value={profilo.aliquota_sostitutiva} unit="%" onChangeText={v => set('aliquota_sostitutiva', v)} />
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
                <FiscaleNumericField label="Contributi INPS" value={profilo.inps_percentuale} unit="%" onChangeText={v => set('inps_percentuale', v)} />
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
                  <FiscaleNumericField label="Riduzione contributiva" value={profilo.riduzione_percentuale} unit="%" onChangeText={v => set('riduzione_percentuale', v)} />
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
                  <FiscaleNumericField label="Rivalsa INPS" value={profilo.rivalsa_percentuale} unit="%" onChangeText={v => set('rivalsa_percentuale', v)} />
                )}
                <FiscaleNumericField label="Soglia massima fatturato" value={profilo.soglia_fatturato} unit="€" onChangeText={v => set('soglia_fatturato', v)} />
              </View>
            )}

            {/* Parametri Ordinario */}
            {profilo.regime === 'ordinario' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Parametri ordinario</Text>
                <FiscaleNumericField label="Aliquota IVA" value={profilo.aliquota_iva} unit="%" onChangeText={v => set('aliquota_iva', v)} />
                <FiscaleNumericField label="Costi deducibili stimati" value={profilo.costi_deducibili_percentuale} unit="%" onChangeText={v => set('costi_deducibili_percentuale', v)} />
                <FiscaleNumericField label="INPS gestione separata" value={profilo.inps_percentuale} unit="%" onChangeText={v => set('inps_percentuale', v)} />
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
                  <FiscaleNumericField label="Rivalsa INPS" value={profilo.rivalsa_percentuale} unit="%" onChangeText={v => set('rivalsa_percentuale', v)} />
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
                <FiscaleNumericField label="Ritenuta d'acconto" value={profilo.ritenuta_acconto} unit="%" onChangeText={v => set('ritenuta_acconto', v)} />
                <FiscaleNumericField label="Soglia esenzione contributi" value={profilo.soglia_occasionale} unit="€" onChangeText={v => set('soglia_occasionale', v)} />
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
