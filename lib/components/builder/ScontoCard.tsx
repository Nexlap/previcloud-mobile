import { StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { formatImportoEuroVisuale } from 'preventivoai-shared'
import { BuilderSectionHeader, builderCardStyles } from './BuilderSectionHeader'

type ScontoTipo = 'percentuale' | 'fisso'

type Props = {
  scontoAttivo: boolean
  scontoTipo: ScontoTipo
  scontoValore: string
  onToggle: () => void
  onChangeTipo: (tipo: ScontoTipo) => void
  onChangeValore: (v: string) => void
  totaleBase: number
}

function parseValoreSconto(raw: string): number {
  const n = parseFloat(raw.replace(',', '.'))
  return Number.isNaN(n) ? 0 : n
}

function calcolaRisparmio(totaleBase: number, tipo: ScontoTipo, valore: number): number {
  if (valore <= 0) return 0
  return tipo === 'percentuale' ? totaleBase * (valore / 100) : valore
}

export function ScontoCard({
  scontoAttivo,
  scontoTipo,
  scontoValore,
  onToggle,
  onChangeTipo,
  onChangeValore,
  totaleBase,
}: Props) {
  const valoreNum = parseValoreSconto(scontoValore)
  const risparmio = scontoAttivo ? calcolaRisparmio(totaleBase, scontoTipo, valoreNum) : 0

  return (
    <View style={builderCardStyles.card}>
      <BuilderSectionHeader
        icon="tag"
        title="Sconto"
        subtitle="Applica uno sconto sul totale del preventivo"
        right={(
          <Switch
            value={scontoAttivo}
            onValueChange={onToggle}
            trackColor={{ false: '#E5E7EB', true: '#0E9F8E' }}
            thumbColor="#fff"
          />
        )}
      />

      {scontoAttivo && (
        <View style={styles.body}>
          <View style={styles.segmented}>
            <TouchableOpacity
              style={[styles.segmentBtn, scontoTipo === 'percentuale' && styles.segmentBtnActive]}
              onPress={() => onChangeTipo('percentuale')}
            >
              <Text style={[styles.segmentText, scontoTipo === 'percentuale' && styles.segmentTextActive]}>%</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentBtn, scontoTipo === 'fisso' && styles.segmentBtnActive]}
              onPress={() => onChangeTipo('fisso')}
            >
              <Text style={[styles.segmentText, scontoTipo === 'fisso' && styles.segmentTextActive]}>€</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor="#9CA3AF"
            keyboardType="decimal-pad"
            value={scontoValore}
            onChangeText={onChangeValore}
          />

          {valoreNum > 0 && (
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Risparmio:</Text>
              <Text style={styles.previewVal}>-€{formatImportoEuroVisuale(risparmio)}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  body: { gap: 10 },
  segmented: {
    flexDirection: 'row',
    backgroundColor: '#F7F8FA',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  segmentBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: '#0D1B2A' },
  segmentText: { fontSize: 13, color: '#9CA3AF', fontWeight: '600' },
  segmentTextActive: { color: '#fff' },
  input: {
    backgroundColor: '#F7F8FA',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    padding: 12,
    fontSize: 14,
    color: '#0D1B2A',
  },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewLabel: { fontSize: 13, color: '#6B7280' },
  previewVal: { fontSize: 14, fontWeight: '700', color: '#0E9F8E' },
})
