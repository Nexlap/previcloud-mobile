import { Dispatch, SetStateAction } from 'react'
import { Alert, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { TrasfertaBuilder } from '../../builder/types'
import { formatImportoEuroVisuale } from '../../utils/importo'
import { PLACEHOLDER } from '../../placeholders'

type Props = {
  trasferte: TrasfertaBuilder[]
  setTrasferte: Dispatch<SetStateAction<TrasfertaBuilder[]>>
  mostraTrasferte: boolean
  setMostraTrasferte: (value: boolean) => void
  nuoviKm: string
  setNuoviKm: (value: string) => void
  nuovaSpesaNome: string
  setNuovaSpesaNome: (value: string) => void
  nuovaSpesaImporto: string
  setNuovaSpesaImporto: (value: string) => void
}

export function TrasferteCard({
  trasferte,
  setTrasferte,
  mostraTrasferte,
  setMostraTrasferte,
  nuoviKm,
  setNuoviKm,
  nuovaSpesaNome,
  setNuovaSpesaNome,
  nuovaSpesaImporto,
  setNuovaSpesaImporto,
}: Props) {
  return (
    <>
        {/* Card trasferte */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>🧳 Trasferte e rimborsi</Text>
              <Text style={styles.cardSub}>Km e spese vive — esenti o imponibili</Text>
            </View>
            <Switch
              value={mostraTrasferte}
              onValueChange={setMostraTrasferte}
              trackColor={{ false: '#E5E7EB', true: '#0E9F8E' }}
              thumbColor="#fff"
            />
          </View>

          {mostraTrasferte && (
            <View style={{ gap: 10 }}>
              {trasferte.map(t => (
                <View key={t.id} style={{ backgroundColor: '#F7F8FA', borderRadius: 12, padding: 12, gap: 8, borderWidth: 1, borderColor: '#E5E7EB' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#0D1B2A' }}>
                      {t.tipo === 'km' ? `🚗 ${t.km} km` : `🧾 ${t.nome}`}
                    </Text>
                    <TouchableOpacity onPress={() => setTrasferte(ts => ts.filter(x => x.id !== t.id))}>
                      <Text style={{ color: '#9CA3AF', fontSize: 16 }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: '#6B7280' }}>€{formatImportoEuroVisuale(parseFloat(t.importo) || 0)}</Text>
                    <TouchableOpacity
                      style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: t.esente ? '#F0FDF4' : '#FEF3C7', borderWidth: 1, borderColor: t.esente ? '#0E9F8E' : '#F59E0B' }}
                      onPress={() => setTrasferte(ts => ts.map(x => x.id === t.id ? { ...x, esente: !x.esente } : x))}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '600', color: t.esente ? '#0E9F8E' : '#F59E0B' }}>
                        {t.esente ? 'Esente' : 'Imponibile'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {/* Rimborso km */}
              <View style={{ borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 10, gap: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.8 }}>RIMBORSO KM</Text>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder={PLACEHOLDER.kmRimborso}
                    placeholderTextColor="#9CA3AF"
                    keyboardType="decimal-pad"
                    value={nuoviKm}
                    onChangeText={setNuoviKm}
                  />
                  <Text style={{ fontSize: 11, color: '#9CA3AF' }}>× €0.25</Text>
                  <TouchableOpacity
                    style={{ backgroundColor: '#0E9F8E', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}
                    onPress={() => {
                      const km = parseFloat(nuoviKm)
                      if (!km || km <= 0) { Alert.alert('Inserisci i km'); return }
                      const importo = (km * 0.25).toFixed(2)
                      setTrasferte(ts => [...ts, { id: Date.now().toString(), tipo: 'km', nome: 'Rimborso km', importo, km: nuoviKm, esente: true }])
                      setNuoviKm('')
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>+ Aggiungi</Text>
                  </TouchableOpacity>
                </View>
                <Text style={{ fontSize: 11, color: '#9CA3AF' }}>Tariffa ACI €0.25/km · Default: esente</Text>
              </View>

              {/* Spesa viva */}
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.8 }}>SPESA VIVA</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    style={[styles.input, { flex: 2 }]}
                    placeholder={PLACEHOLDER.spesaVivaNome}
                    placeholderTextColor="#9CA3AF"
                    value={nuovaSpesaNome}
                    onChangeText={setNuovaSpesaNome}
                  />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder={PLACEHOLDER.importoEuro}
                    placeholderTextColor="#9CA3AF"
                    keyboardType="decimal-pad"
                    value={nuovaSpesaImporto}
                    onChangeText={setNuovaSpesaImporto}
                  />
                </View>
                <TouchableOpacity
                  style={{ backgroundColor: '#F7F8FA', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' }}
                  onPress={() => {
                    if (!nuovaSpesaNome.trim() || !nuovaSpesaImporto) { Alert.alert('Inserisci nome e importo'); return }
                    setTrasferte(ts => [...ts, { id: Date.now().toString(), tipo: 'spesa', nome: nuovaSpesaNome.trim(), importo: nuovaSpesaImporto, esente: true }])
                    setNuovaSpesaNome('')
                    setNuovaSpesaImporto('')
                  }}
                >
                  <Text style={{ fontSize: 13, color: '#0E9F8E', fontWeight: '600' }}>+ Aggiungi spesa</Text>
                </TouchableOpacity>
              </View>

              {trasferte.length > 0 && (
                <View style={{ borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, color: '#6B7280' }}>Totale trasferte</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#0D1B2A' }}>
                    €{formatImportoEuroVisuale(trasferte.reduce((a, t) => a + (parseFloat(t.importo) || 0), 0))}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
    </>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#0D1B2A' },
  cardSub: { fontSize: 12, color: '#9CA3AF', marginTop: -6 },
  input: { backgroundColor: '#F7F8FA', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 12, fontSize: 14, color: '#0D1B2A' },
})
