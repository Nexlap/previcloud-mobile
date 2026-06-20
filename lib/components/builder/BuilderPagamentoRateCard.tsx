import { StyleSheet, Switch, Text, TextInput, View } from 'react-native'
import { calcolaImportiRate, calcolaScadenzeRate, formatImportoEuro, labelScadenzaRata } from 'preventivoai-shared'
import { giornoScadenzaValido, meseInizioValido } from 'preventivoai-shared'
import { GiornoScadenzaPicker, MeseInizioPicker } from '../pickers/DatePartPickers'

type Props = {
  attivo: boolean
  numeroRate: string
  giornoScadenza: string
  meseInizio: string
  visibileNelPDF: boolean
  importoTotale: number
  onChangeAttivo: (value: boolean) => void
  onChangeNumeroRate: (value: string) => void
  onChangeGiornoScadenza: (value: string) => void
  onChangeMeseInizio: (value: string) => void
  onChangeVisibileNelPDF: (value: boolean) => void
}

export function BuilderPagamentoRateCard({
  attivo,
  numeroRate,
  giornoScadenza,
  meseInizio,
  visibileNelPDF,
  importoTotale,
  onChangeAttivo,
  onChangeNumeroRate,
  onChangeGiornoScadenza,
  onChangeMeseInizio,
  onChangeVisibileNelPDF,
}: Props) {
  const num = parseInt(numeroRate, 10) || 0
  const giorno = parseInt(giornoScadenza, 10) || 0
  const mese = parseInt(meseInizio, 10) || 0
  const importi = num >= 2 && importoTotale > 0 ? calcolaImportiRate(importoTotale, num) : []
  const importoRata = importi[0]
  const ultimaRata = importi.length > 0 ? importi[importi.length - 1] : null
  const primaScadenza = num >= 2 && giornoScadenzaValido(giornoScadenza) && meseInizioValido(meseInizio)
    ? calcolaScadenzeRate(1, giorno, mese)[0]
    : null

  return (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Pagamento a rate</Text>
          <Text style={styles.cardSub}>Rateizza l&apos;importo del preventivo per questo cliente</Text>
        </View>
        <Switch
          value={attivo}
          onValueChange={onChangeAttivo}
          trackColor={{ false: '#E5E7EB', true: '#0E9F8E' }}
          thumbColor="#fff"
        />
      </View>
      {attivo && (
        <View style={{ gap: 10, marginTop: 8 }}>
          <View>
            <Text style={styles.fieldLabel}>IMPORTO TOTALE PREVENTIVO</Text>
            <View style={styles.readonlyBox}>
              <Text style={styles.readonlyValue}>
                {importoTotale > 0 ? `\u20AC${formatImportoEuro(importoTotale, 2)}` : '\u2014'}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>NUMERO DI RATE</Text>
              <TextInput
                style={styles.input}
                value={numeroRate}
                onChangeText={onChangeNumeroRate}
                keyboardType="number-pad"
                placeholder="es. 3"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>GIORNO SCADENZA</Text>
              <GiornoScadenzaPicker
                value={giornoScadenza}
                onChange={onChangeGiornoScadenza}
                mese={meseInizio}
              />
            </View>
          </View>
          <View>
            <Text style={styles.fieldLabel}>MESE INIZIO PRIMA RATA</Text>
            <MeseInizioPicker
              value={meseInizio}
              onChange={onChangeMeseInizio}
              giornoCollegato={giornoScadenza}
              onGiornoCollegatoChange={onChangeGiornoScadenza}
            />
          </View>
          {importoRata != null ? (
            <View style={styles.anteprimaBox}>
              <Text style={styles.anteprimaTitle}>Anteprima rate</Text>
              <Text style={styles.anteprimaRow}>
                {`${num} rate da \u20AC${formatImportoEuro(importoRata, 2)}`}
              </Text>
              {primaScadenza ? (
                <Text style={styles.anteprimaRow}>
                  {`Prima rata: ${labelScadenzaRata(primaScadenza.mese, primaScadenza.anno, primaScadenza.giorno)}`}
                </Text>
              ) : null}
              {ultimaRata != null && ultimaRata !== importoRata ? (
                <Text style={styles.anteprimaRow}>
                  {`Ultima rata: \u20AC${formatImportoEuro(ultimaRata, 2)}`}
                </Text>
              ) : null}
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Mostra nel PDF</Text>
              <Text style={styles.toggleSub}>Aggiunge il piano rate al documento</Text>
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
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#0D1B2A' },
  cardSub: { fontSize: 12, color: '#9CA3AF', marginBottom: 8 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.8, marginBottom: 4 },
  readonlyBox: { backgroundColor: '#F7F8FA', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 12 },
  readonlyValue: { fontSize: 14, fontWeight: '600', color: '#0D1B2A' },
  input: { backgroundColor: '#F7F8FA', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 12, fontSize: 14, color: '#0D1B2A' },
  anteprimaBox: { backgroundColor: '#F7F8FA', borderRadius: 12, padding: 12, gap: 4 },
  anteprimaTitle: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 2 },
  anteprimaRow: { fontSize: 13, color: '#0D1B2A' },
  toggleLabel: { fontSize: 13, fontWeight: '500', color: '#0D1B2A' },
  toggleSub: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
})

