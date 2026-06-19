import { StyleSheet, Switch, Text, TextInput, View } from 'react-native'
import { calcolaScadenzeRate, labelScadenzaRata } from '../../utils/importo'
import { giornoScadenzaValido, meseInizioValido } from '../../utils/giornoScadenza'
import { GiornoScadenzaPicker, MeseInizioPicker } from '../pickers/DatePartPickers'

type TariffaProps = {
  nascondiPrezzi: boolean
  onChangeNascondiPrezzi: (value: boolean) => void
}

export function PreventivoPdfTariffaToggle({ nascondiPrezzi, onChangeNascondiPrezzi }: TariffaProps) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleLabel}>Tariffa a corpo</Text>
        <Text style={styles.toggleSub}>Nasconde i prezzi delle singole voci - mostra solo il totale</Text>
      </View>
      <Switch
        value={nascondiPrezzi}
        onValueChange={onChangeNascondiPrezzi}
        trackColor={{ false: '#E5E7EB', true: '#0E9F8E' }}
        thumbColor="#fff"
      />
    </View>
  )
}

type AbbonamentoProps = {
  attivo: boolean
  importo: string
  giorno: string
  meseInizio: string
  mensilita: string
  visibileNelPDF: boolean
  importoTotale?: string
  onChangeAttivo: (value: boolean) => void
  onChangeImporto: (value: string) => void
  onChangeGiorno: (value: string) => void
  onChangeMeseInizio: (value: string) => void
  onChangeMensilita: (value: string) => void
  onChangeVisibileNelPDF: (value: boolean) => void
}

export function PreventivoPdfAbbonamentoCard({
  attivo,
  importo,
  giorno,
  meseInizio,
  mensilita,
  visibileNelPDF,
  importoTotale,
  onChangeAttivo,
  onChangeImporto,
  onChangeGiorno,
  onChangeMeseInizio,
  onChangeMensilita,
  onChangeVisibileNelPDF,
}: AbbonamentoProps) {
  const giornoNum = parseInt(giorno, 10) || 0
  const meseNum = parseInt(meseInizio, 10) || 0
  const primaScadenza = giornoScadenzaValido(giorno) && meseInizioValido(meseInizio)
    ? calcolaScadenzeRate(1, giornoNum, meseNum)[0]
    : null

  return (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Abbonamento mensile</Text>
          <Text style={styles.cardSub}>Configura un canone ricorrente per questo cliente</Text>
        </View>
        <Switch
          value={attivo}
          onValueChange={(v) => {
            onChangeAttivo(v)
            if (v && importoTotale) onChangeImporto(importoTotale)
          }}
          trackColor={{ false: '#E5E7EB', true: '#0E9F8E' }}
          thumbColor="#fff"
        />
      </View>
      {attivo && (
        <View style={{ gap: 10, marginTop: 8 }}>
          <View style={styles.abFieldRow}>
            <View style={styles.abFieldCol}>
              <Text style={styles.abLabelInRow}>IMPORTO MENSILE (EUR)</Text>
              <TextInput
                style={styles.abInput}
                value={importo}
                onChangeText={onChangeImporto}
                keyboardType="decimal-pad"
                placeholder="es. 400"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <View style={styles.abFieldCol}>
              <Text style={styles.abLabelInRow}>GIORNO SCADENZA</Text>
              <GiornoScadenzaPicker
                value={giorno}
                onChange={onChangeGiorno}
                mese={meseInizio}
              />
            </View>
          </View>
          <View>
            <Text style={styles.abLabel}>MESE INIZIO PRIMO CANONE</Text>
            <MeseInizioPicker
              value={meseInizio}
              onChange={onChangeMeseInizio}
              giornoCollegato={giorno}
              onGiornoCollegatoChange={onChangeGiorno}
            />
          </View>
          {primaScadenza ? (
            <Text style={styles.anteprimaCanone}>
              {`Primo canone: ${labelScadenzaRata(primaScadenza.mese, primaScadenza.anno, primaScadenza.giorno)}`}
            </Text>
          ) : null}
          <View>
            <Text style={styles.abLabel}>N. MENSILITA (opzionale)</Text>
            <TextInput
              style={styles.abInput}
              value={mensilita}
              onChangeText={onChangeMensilita}
              keyboardType="number-pad"
              placeholder="es. 12 - lascia vuoto per canone aperto"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '500', color: '#0D1B2A' }}>Mostra nel PDF</Text>
              <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>Aggiunge il canone mensile al documento</Text>
            </View>
            <Switch
              value={visibileNelPDF}
              onValueChange={onChangeVisibileNelPDF}
              trackColor={{ false: '#E5E7EB', true: '#0E9F8E' }}
              thumbColor="#fff"
            />
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  toggleRow: { backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  toggleLabel: { fontSize: 14, fontWeight: '500', color: '#0D1B2A' },
  toggleSub: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#0D1B2A' },
  cardSub: { fontSize: 12, color: '#9CA3AF', marginBottom: 8 },
  abLabel: { fontSize: 11, fontWeight: '600' as const, color: '#9CA3AF', letterSpacing: 0.8, marginBottom: 4 },
  abFieldRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  abFieldCol: { flex: 1 },
  abLabelInRow: { fontSize: 11, fontWeight: '600' as const, color: '#9CA3AF', letterSpacing: 0.8, marginBottom: 4, minHeight: 30 },
  abInput: { backgroundColor: '#F7F8FA', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 12, fontSize: 14, color: '#0D1B2A' },
  anteprimaCanone: { fontSize: 13, color: '#0D1B2A', backgroundColor: '#F7F8FA', borderRadius: 12, padding: 12 },
})
