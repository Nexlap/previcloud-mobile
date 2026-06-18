import type { Dispatch, SetStateAction } from 'react'
import { Alert, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { RisultatoFiscale } from '../../builder/types'
import { ProfiloFiscale, VocePreventivo } from '../../types'
import { formatImportoEuroVisuale } from '../../utils/importo'

type Props = {
  profiloFiscale: ProfiloFiscale | null
  mostraFiscale: boolean
  setMostraFiscale: (value: boolean) => void
  fiscale: RisultatoFiscale | null
  voci: VocePreventivo[]
  setVoci: Dispatch<SetStateAction<VocePreventivo[]>>
  storicoVoci: VocePreventivo[][]
  setStoricoVoci: Dispatch<SetStateAction<VocePreventivo[][]>>
  nettoDesiderato: string
  setNettoDesiderato: (value: string) => void
  lordomCalcolato: number | null
  setLordoCalcolato: (value: number | null) => void
  calcolaLordoDaNetto: (netto: number) => number | null
  calcolaTotale: () => number
  fmt: (value: number) => string
  onInputFocus?: () => void
}

export function AnalisiFiscaleCard({
  profiloFiscale,
  mostraFiscale,
  setMostraFiscale,
  fiscale: f,
  voci,
  setVoci,
  storicoVoci,
  setStoricoVoci,
  nettoDesiderato,
  setNettoDesiderato,
  lordomCalcolato,
  setLordoCalcolato,
  calcolaLordoDaNetto,
  calcolaTotale,
  fmt,
  onInputFocus,
}: Props) {
  if (!profiloFiscale) return null

  return (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={styles.cardTitle}>💰 Analisi fiscale</Text>
        <Switch value={mostraFiscale} onValueChange={setMostraFiscale}
          trackColor={{ false: '#E5E7EB', true: '#0E9F8E' }} thumbColor="#fff" />
      </View>
      {mostraFiscale && f && (
        <View style={styles.fiscaleBox}>
          {f.regime === 'forfettario' && (
            <>
              <View style={styles.fiscaleRow}>
                <Text style={styles.fiscaleLabel}>Fatturato lordo</Text>
                <Text style={styles.fiscaleVal}>€{fmt(f.lordo)}</Text>
              </View>
              {f.rivalsa > 0 && (
                <View style={styles.fiscaleRow}>
                  <Text style={styles.fiscaleLabel}>{`+ Rivalsa INPS (${profiloFiscale.rivalsa_percentuale}%)`}</Text>
                  <Text style={styles.fiscaleVal}>+€{fmt(f.rivalsa)}</Text>
                </View>
              )}
              <View style={styles.fiscaleRow}>
                <Text style={styles.fiscaleLabel}>= Totale fattura cliente</Text>
                <Text style={[styles.fiscaleVal, { fontWeight: '700' }]}>€{fmt(f.totaleCliente)}</Text>
              </View>
              <View style={styles.fiscaleSep} />
              <View style={styles.fiscaleRow}>
                <Text style={styles.fiscaleLabel}>{`Reddito imponibile (${profiloFiscale.coefficiente_redditivita}%)`}</Text>
                <Text style={styles.fiscaleVal}>€{fmt(f.imponibile)}</Text>
              </View>
              <View style={styles.fiscaleRow}>
                <Text style={styles.fiscaleLabel}>- Contributi INPS</Text>
                <Text style={styles.fiscaleNeg}>-€{fmt(f.contributi)}</Text>
              </View>
              <View style={styles.fiscaleRow}>
                <Text style={styles.fiscaleLabel}>{`- Imposta sostitutiva (${profiloFiscale.aliquota_sostitutiva}%)`}</Text>
                <Text style={styles.fiscaleNeg}>-€{fmt(f.imposta)}</Text>
              </View>
              <View style={styles.fiscaleSep} />
              <View style={styles.fiscaleRow}>
                <Text style={styles.fiscaleNetto}>Netto stimato</Text>
                <Text style={styles.fiscaleNettoVal}>€{fmt(f.netto)}</Text>
              </View>
            </>
          )}
          {f.regime === 'ordinario' && (
            <>
              <View style={styles.fiscaleRow}>
                <Text style={styles.fiscaleLabel}>Fatturato lordo</Text>
                <Text style={styles.fiscaleVal}>€{fmt(f.lordo)}</Text>
              </View>
              {f.iva > 0 && (
                <View style={styles.fiscaleRow}>
                  <Text style={styles.fiscaleLabel}>{`+ IVA (${profiloFiscale.aliquota_iva}%)`}</Text>
                  <Text style={styles.fiscaleVal}>+€{fmt(f.iva)}</Text>
                </View>
              )}
              {f.rivalsa > 0 && (
                <View style={styles.fiscaleRow}>
                  <Text style={styles.fiscaleLabel}>+ Rivalsa INPS</Text>
                  <Text style={styles.fiscaleVal}>+€{fmt(f.rivalsa)}</Text>
                </View>
              )}
              <View style={styles.fiscaleRow}>
                <Text style={styles.fiscaleLabel}>= Totale fattura cliente</Text>
                <Text style={[styles.fiscaleVal, { fontWeight: '700' }]}>€{fmt(f.totaleCliente)}</Text>
              </View>
              <View style={styles.fiscaleSep} />
              <View style={styles.fiscaleRow}>
                <Text style={styles.fiscaleLabel}>- Contributi INPS</Text>
                <Text style={styles.fiscaleNeg}>-€{fmt(f.contributi)}</Text>
              </View>
              <View style={styles.fiscaleRow}>
                <Text style={styles.fiscaleLabel}>- IRPEF stimata</Text>
                <Text style={styles.fiscaleNeg}>-€{fmt(f.irpef)}</Text>
              </View>
              <View style={styles.fiscaleSep} />
              <View style={styles.fiscaleRow}>
                <Text style={styles.fiscaleNetto}>Netto stimato</Text>
                <Text style={styles.fiscaleNettoVal}>€{fmt(f.netto)}</Text>
              </View>
            </>
          )}
          {f.regime === 'occasionale' && (
            <>
              <View style={styles.fiscaleRow}>
                <Text style={styles.fiscaleLabel}>Compenso lordo</Text>
                <Text style={styles.fiscaleVal}>€{fmt(f.lordo)}</Text>
              </View>
              <View style={styles.fiscaleRow}>
                <Text style={styles.fiscaleLabel}>{`- Ritenuta d'acconto (${profiloFiscale.ritenuta_acconto}%)`}</Text>
                <Text style={styles.fiscaleNeg}>-€{fmt(f.ritenuta)}</Text>
              </View>
              <View style={styles.fiscaleSep} />
              <View style={styles.fiscaleRow}>
                <Text style={styles.fiscaleNetto}>Netto stimato</Text>
                <Text style={styles.fiscaleNettoVal}>€{fmt(f.netto)}</Text>
              </View>
            </>
          )}
          <Text style={styles.fiscaleDisclaimer}>⚠️ Calcolo indicativo — consulta il tuo commercialista</Text>

          <View style={styles.fiscaleSep} />
          <Text style={[styles.fiscaleLabel, { marginBottom: 4 }]}>🧮 Voglio incassare (netto)</Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TextInput
              style={[styles.voceCostoInput, { flex: 1, fontSize: 14 }]}
              value={nettoDesiderato}
              onChangeText={v => { setNettoDesiderato(v); setLordoCalcolato(null) }}
              onFocus={onInputFocus}
              placeholder="es. 2000"
              placeholderTextColor="#9CA3AF"
              keyboardType="decimal-pad"
            />
            <TouchableOpacity
              style={[styles.generateBtn, { paddingVertical: 10, paddingHorizontal: 14 }]}
              onPress={() => {
                const netto = parseFloat(nettoDesiderato.replace(',', '.'))
                if (!netto || netto <= 0) { Alert.alert('Inserisci un valore valido'); return }
                const lordo = calcolaLordoDaNetto(netto)
                setLordoCalcolato(lordo)
              }}
            >
              <Text style={[styles.generateBtnText, { fontSize: 13 }]}>Calcola</Text>
            </TouchableOpacity>
          </View>
          {lordomCalcolato !== null && voci.length > 0 && (
            <View style={{ backgroundColor: '#F0FDF4', borderRadius: 10, padding: 12, gap: 6, marginTop: 4 }}>
              <Text style={{ fontSize: 12, color: '#065F46', fontWeight: '600' }}>
                Lordo da fatturare: €{formatImportoEuroVisuale(lordomCalcolato)}
              </Text>
              <TouchableOpacity
                style={[styles.generateBtn, { backgroundColor: '#0E9F8E', paddingVertical: 10 }]}
                onPress={() => {
                  if (voci.length === 0) { Alert.alert('Aggiungi servizi prima'); return }
                  const totaleAttuale = calcolaTotale()
                  if (totaleAttuale === 0) { Alert.alert('I prezzi sono tutti a zero'); return }
                  const fattore = lordomCalcolato / totaleAttuale
                  setStoricoVoci(s => [...s, voci])
                  setVoci(v => v.map(x => ({
                    ...x,
                    costo: (Math.round((parseFloat(x.costo) || 0) * fattore)).toString()
                  })))
                  setLordoCalcolato(null)
                  setNettoDesiderato('')
                }}
              >
                <Text style={[styles.generateBtnText, { fontSize: 13 }]}>✓ Applica al preventivo</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 10, color: '#9CA3AF', textAlign: 'center' }}>
                I prezzi delle voci verranno scalati proporzionalmente
              </Text>
            </View>
          )}
          {storicoVoci.length > 0 && (
            <TouchableOpacity
              style={{ alignItems: 'center', padding: 8 }}
              onPress={() => {
                const precedente = storicoVoci[storicoVoci.length - 1]
                setVoci(precedente)
                setStoricoVoci(s => s.slice(0, -1))
                setLordoCalcolato(null)
                setNettoDesiderato('')
              }}
            >
              <Text style={{ fontSize: 13, color: '#9CA3AF' }}>↩ Annulla ultimo calcolo ({storicoVoci.length} step)</Text>
            </TouchableOpacity>
          )}
          {lordomCalcolato !== null && voci.length === 0 && (
            <Text style={{ fontSize: 12, color: '#0E9F8E', marginTop: 4 }}>
              Lordo da fatturare: €{formatImportoEuroVisuale(lordomCalcolato)} — aggiungi servizi per applicare
            </Text>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#0D1B2A' },
  voceCostoInput: { backgroundColor: '#F7F8FA', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', padding: 8, fontSize: 14, color: '#0D1B2A', textAlign: 'center' as const, fontWeight: '600' as const },
  generateBtn: { backgroundColor: '#0D1B2A', borderRadius: 16, padding: 16, alignItems: 'center' as const },
  generateBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  fiscaleBox: { gap: 6 },
  fiscaleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  fiscaleLabel: { fontSize: 12, color: '#6B7280', flex: 1 },
  fiscaleVal: { fontSize: 13, color: '#374151' },
  fiscaleNeg: { fontSize: 13, color: '#EF4444' },
  fiscaleSep: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 4 },
  fiscaleNetto: { fontSize: 14, fontWeight: '700', color: '#0D1B2A', flex: 1 },
  fiscaleNettoVal: { fontSize: 16, fontWeight: '700', color: '#0E9F8E' },
  fiscaleDisclaimer: { fontSize: 10, color: '#9CA3AF', fontStyle: 'italic' as const, marginTop: 6 },
})
