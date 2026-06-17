import { useLocalSearchParams } from 'expo-router'
import { useMemo, useState } from 'react'
import {
  ActivityIndicator, Alert, Linking, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
  type DimensionValue,
} from 'react-native'
import { sessioneClienteDettaglio } from '../../api/clienteDettaglio'
import { creaLinkPagamentoRata } from '../../api/pdf'
import { MESI_BREVI } from '../../constants'
import { useAbbonamento } from '../../hooks/useAbbonamento'
import { usePreventivi } from '../../hooks/usePreventivi'
import { RataAbbonamento } from '../../types'
import { errorMessage } from '../../utils/errors'
import { calcolaImportiRate, formatImportoEuro } from '../../utils/importo'
import { titoloHeaderPiano } from '../../utils/preventivoMadre'
import { PreventivoMadreLink } from './PreventivoMadreLink'
import { StoricoPianiCollegati } from './StoricoPianiCollegati'

const MESI_FULL = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]

function labelScadenza(rata: RataAbbonamento) {
  return `${MESI_BREVI[rata.mese - 1]} ${rata.anno}`
}

function badgeRata(stato: RataAbbonamento['stato']) {
  if (stato === 'incassato') return { label: 'Pagata', bg: '#D1FAE5', color: '#0E9F8E' }
  if (stato === 'in_ritardo') return { label: 'Scaduta', bg: '#FEE2E2', color: '#EF4444' }
  if (stato === 'parziale') return { label: 'Parziale', bg: '#FEF3C7', color: '#D97706' }
  return { label: 'Da pagare', bg: '#FEF3C7', color: '#D97706' }
}

function ordinaRate(a: RataAbbonamento, b: RataAbbonamento) {
  return a.anno - b.anno || a.mese - b.mese
}

type RataMiniProps = {
  rata: RataAbbonamento
  index: number
  aperta: boolean
  invioReminderLoading: string | null
  mostraReminder: boolean
  onToggle: () => void
  onSegnaPagata: (pagata: boolean) => void
  onReminder: () => void
}

function RataMiniRow({
  rata,
  index,
  aperta,
  invioReminderLoading,
  mostraReminder,
  onToggle,
  onSegnaPagata,
  onReminder,
}: RataMiniProps) {
  const badge = badgeRata(rata.stato)
  const pagata = rata.stato === 'incassato'
  return (
    <View style={styles.rataMiniTab}>
      <TouchableOpacity style={styles.rataMiniRow} onPress={onToggle} activeOpacity={0.7}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rataMiniTitolo}>{`Rata ${index + 1} \u00B7 ${labelScadenza(rata)}`}</Text>
        </View>
        <Text style={styles.rataMiniImporto}>{`\u20AC${formatImportoEuro(rata.importo, 2)}`}</Text>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
        </View>
        <Text style={styles.sectionArrow}>{aperta ? '\u25B2' : '\u25BC'}</Text>
      </TouchableOpacity>
      {aperta ? (
        <View style={styles.rataMiniDetail}>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Segna come pagata</Text>
            <Switch
              value={pagata}
              onValueChange={onSegnaPagata}
              trackColor={{ false: '#E5E7EB', true: '#0E9F8E' }}
              thumbColor="#fff"
            />
          </View>
          {mostraReminder && !pagata ? (
            <TouchableOpacity
              style={styles.reminderBtn}
              onPress={onReminder}
              disabled={invioReminderLoading === rata.id}
            >
              {invioReminderLoading === rata.id
                ? <ActivityIndicator size="small" color="#25D366" />
                : <Text style={styles.reminderBtnText}>Invia reminder</Text>}
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

export function ClientePagamentoRateTab({
  onApriPreventivoMadre,
  onPianoAggiornato,
}: {
  onApriPreventivoMadre?: (preventivoId: string) => void
  onPianoAggiornato?: () => void | Promise<void>
}) {
  const { id: clienteId, nome: clienteNome } = useLocalSearchParams<{ id: string; nome?: string }>()
  const { preventivi, loading: loadingPrev } = usePreventivi({ clienteId })
  const {
    abbonamento, abbonamentiStorico, preventivoMadre, preventiviMadreStorico, rate, loading: loadingAb,
    creaPianoRate, segnaRataPagata, totaleIncassato, totaleParziale,
    modificaImportoPianoRate, eliminaAbbonamento,
  } = useAbbonamento(clienteId || '', { soloTipo: 'rate' })

  const [numeroRate, setNumeroRate] = useState('3')
  const [salvando, setSalvando] = useState(false)
  const [invioReminderLoading, setInvioReminderLoading] = useState<string | null>(null)
  const [pianoEspanso, setPianoEspanso] = useState(false)
  const [futureAperte, setFutureAperte] = useState(true)
  const [storicoAperto, setStoricoAperto] = useState(false)
  const [rataMiniAperta, setRataMiniAperta] = useState<string | null>(null)
  const [modificaImporto, setModificaImporto] = useState(false)
  const [nuovoImportoTotale, setNuovoImportoTotale] = useState('')
  const [salvaImportoLoading, setSalvaImportoLoading] = useState(false)

  const preventivoAttivo = preventivi.find(p => p.is_ultimo) || preventivi[0]
  const importoTotale = preventivoAttivo?.importo_totale || 0
  const numRate = parseInt(numeroRate, 10) || 0

  const importiAnteprima = useMemo(() => {
    if (numRate < 2 || importoTotale <= 0) return []
    return calcolaImportiRate(importoTotale, numRate)
  }, [numRate, importoTotale])

  const rateOrdinate = useMemo(() => [...rate].sort(ordinaRate), [rate])
  const rateFuture = useMemo(
    () => rateOrdinate.filter(r => r.stato !== 'incassato'),
    [rateOrdinate],
  )
  const rateStorico = useMemo(
    () => rateOrdinate.filter(r => r.stato === 'incassato'),
    [rateOrdinate],
  )
  const ratePagate = rateStorico.length
  const importoPiano = rate.reduce((a, r) => a + r.importo, 0)
  const importoRaccolto = totaleIncassato + totaleParziale
  const progresso = importoPiano > 0 ? (importoRaccolto / importoPiano) * 100 : 0
  const prossima = rateFuture[0]

  async function onCreaPiano() {
    if (!preventivoAttivo?.id) {
      Alert.alert('Nessun preventivo', 'Serve un preventivo attivo per creare il piano a rate.')
      return
    }
    if (numRate < 2) {
      Alert.alert('Numero rate', 'Inserisci almeno 2 rate.')
      return
    }
    setSalvando(true)
    const ok = await creaPianoRate(preventivoAttivo.id, importoTotale, numRate)
    setSalvando(false)
    if (ok) {
      await onPianoAggiornato?.()
      Alert.alert('Piano creato', 'Le rate sono state generate.')
    }
  }

  async function inviaReminder(rata: RataAbbonamento) {
    try {
      setInvioReminderLoading(rata.id)
      const session = await sessioneClienteDettaglio()
      if (!session) return
      const residuo = rata.importo - (rata.acconto || 0)
      const link = await creaLinkPagamentoRata(rata.id, clienteNome || '', session.access_token)
      const testo = `Ciao ${clienteNome || ''}, ti ricordo il pagamento di \u20AC${residuo} per la rata di ${MESI_FULL[rata.mese - 1]} ${rata.anno}. Puoi pagare qui: ${link}`
      const url = `whatsapp://send?text=${encodeURIComponent(testo)}`
      if (await Linking.canOpenURL(url)) {
        await Linking.openURL(url)
      } else {
        Alert.alert('WhatsApp non disponibile', 'Copia il link e invialo manualmente', [{ text: 'OK' }])
      }
    } catch (err: unknown) {
      Alert.alert('Errore', errorMessage(err))
    } finally {
      setInvioReminderLoading(null)
    }
  }

  function modificaNumeroRate(delta: number) {
    setNumeroRate(String(Math.max(2, numRate + delta)))
  }

  function apriModificaImporto() {
    setNuovoImportoTotale(String(abbonamento?.importo_default ?? importoPiano))
    setModificaImporto(true)
    setPianoEspanso(true)
  }

  async function salvaModificaImporto() {
    const val = parseFloat(nuovoImportoTotale.replace(',', '.'))
    if (!(val > 0)) {
      Alert.alert('Importo non valido', 'Inserisci un importo maggiore di zero.')
      return
    }
    setSalvaImportoLoading(true)
    const ok = await modificaImportoPianoRate(val)
    setSalvaImportoLoading(false)
    if (ok) {
      setModificaImporto(false)
      Alert.alert('Importo aggiornato', 'Le rate non ancora pagate sono state ricalcolate.')
    }
  }

  function confermaEliminaPiano() {
    Alert.alert(
      'Elimina piano a rate',
      'Il piano verrà disattivato. Le rate già registrate restano nello storico.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            await eliminaAbbonamento()
            await onPianoAggiornato?.()
            setModificaImporto(false)
            setPianoEspanso(false)
          },
        },
      ],
    )
  }

  if (loadingPrev || loadingAb) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0E9F8E" />
      </View>
    )
  }

  if (abbonamento && rate.length > 0) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.pianoHeader}
          onPress={() => setPianoEspanso(v => {
            if (v) setModificaImporto(false)
            return !v
          })}
          activeOpacity={0.8}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.pianoHeaderTitle} numberOfLines={1} ellipsizeMode="tail">
              {titoloHeaderPiano(abbonamento.nome, preventivoMadre, 'rate', 'Piano a rate')}
            </Text>
            <Text style={styles.pianoHeaderSub}>
              {`${ratePagate}/${rate.length} rate pagate \u00B7 \u20AC${formatImportoEuro(importoRaccolto, 2)} su \u20AC${formatImportoEuro(importoPiano, 2)}`}
            </Text>
            {prossima ? (
              <Text style={styles.pianoHeaderHint}>
                {`Prossima: ${labelScadenza(prossima)} \u00B7 \u20AC${formatImportoEuro(prossima.importo, 2)}`}
              </Text>
            ) : null}
          </View>
          <Text style={styles.sectionArrow}>{pianoEspanso ? '\u25B2' : '\u25BC'}</Text>
        </TouchableOpacity>

        {pianoEspanso ? (
          <View style={styles.pianoBody}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(100, progresso)}%` as DimensionValue }]} />
            </View>

            <PreventivoMadreLink
              preventivo={preventivoMadre}
              onPress={onApriPreventivoMadre}
            />

            {rateFuture.length > 0 ? (
              <View style={styles.section}>
                <TouchableOpacity style={styles.sectionHeader} onPress={() => setFutureAperte(v => !v)}>
                  <Text style={styles.sectionTitle}>{`Prossime scadenze (${rateFuture.length})`}</Text>
                  <Text style={styles.sectionArrow}>{futureAperte ? '\u25B2' : '\u25BC'}</Text>
                </TouchableOpacity>
                {futureAperte ? rateFuture.map((rata) => {
                  const index = rateOrdinate.findIndex(r => r.id === rata.id)
                  return (
                    <RataMiniRow
                      key={rata.id}
                      rata={rata}
                      index={index}
                      aperta={rataMiniAperta === rata.id}
                      invioReminderLoading={invioReminderLoading}
                      mostraReminder={prossima?.id === rata.id}
                      onToggle={() => setRataMiniAperta(id => id === rata.id ? null : rata.id)}
                      onSegnaPagata={v => segnaRataPagata(rata.id, v)}
                      onReminder={() => inviaReminder(rata)}
                    />
                  )
                }) : null}
              </View>
            ) : null}

            {rateStorico.length > 0 ? (
              <View style={styles.section}>
                <TouchableOpacity style={styles.sectionHeader} onPress={() => setStoricoAperto(v => !v)}>
                  <Text style={styles.sectionTitle}>{`Storico (${rateStorico.length})`}</Text>
                  <Text style={styles.sectionArrow}>{storicoAperto ? '\u25B2' : '\u25BC'}</Text>
                </TouchableOpacity>
                {storicoAperto ? rateStorico.map((rata) => {
                  const index = rateOrdinate.findIndex(r => r.id === rata.id)
                  return (
                    <RataMiniRow
                      key={rata.id}
                      rata={rata}
                      index={index}
                      aperta={rataMiniAperta === rata.id}
                      invioReminderLoading={invioReminderLoading}
                      mostraReminder={false}
                      onToggle={() => setRataMiniAperta(id => id === rata.id ? null : rata.id)}
                      onSegnaPagata={v => segnaRataPagata(rata.id, v)}
                      onReminder={() => inviaReminder(rata)}
                    />
                  )
                }) : null}
              </View>
            ) : null}

            {modificaImporto ? (
              <View style={styles.modificaBox}>
                <Text style={styles.fieldLabel}>NUOVO IMPORTO TOTALE</Text>
                <TextInput
                  style={styles.input}
                  value={nuovoImportoTotale}
                  onChangeText={setNuovoImportoTotale}
                  keyboardType="decimal-pad"
                  placeholder="es. 3000"
                  placeholderTextColor="#9CA3AF"
                />
                <View style={styles.modificaActions}>
                  <TouchableOpacity style={styles.abAzioneBtn} onPress={() => setModificaImporto(false)}>
                    <Text style={styles.abAzioneBtnText}>Annulla</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.abAzioneBtn, styles.abAzioneBtnPrimary]}
                    onPress={salvaModificaImporto}
                    disabled={salvaImportoLoading}
                  >
                    {salvaImportoLoading
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={styles.abAzioneBtnPrimaryText}>Salva</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={styles.abAzioneBtn} onPress={apriModificaImporto}>
                  <Text style={styles.abAzioneBtnText}>{'\u270F\uFE0F'} Modifica importo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.abAzioneBtn, { borderColor: '#FCA5A5' }]} onPress={confermaEliminaPiano}>
                  <Text style={[styles.abAzioneBtnText, { color: '#EF4444' }]}>{'\uD83D\uDDD1'} Elimina piano</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : null}

        <StoricoPianiCollegati
          piani={abbonamentiStorico}
          preventivi={preventiviMadreStorico}
          onApriPreventivo={onApriPreventivoMadre}
        />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Crea piano a rate</Text>
        <Text style={styles.fieldLabel}>IMPORTO TOTALE PREVENTIVO</Text>
        <View style={styles.readonlyBox}>
          <Text style={styles.readonlyValue}>
            {importoTotale > 0 ? `\u20AC${formatImportoEuro(importoTotale, 2)}` : 'Nessun importo disponibile'}
          </Text>
        </View>
        {preventivoAttivo ? (
          <PreventivoMadreLink preventivo={preventivoAttivo} />
        ) : null}

        <Text style={styles.fieldLabel}>NUMERO DI RATE</Text>
        <View style={styles.stepperRow}>
          <TouchableOpacity style={styles.stepperBtn} onPress={() => modificaNumeroRate(-1)}>
            <Text style={styles.stepperBtnText}>{'\u2212'}</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.stepperInput}
            value={numeroRate}
            onChangeText={setNumeroRate}
            keyboardType="number-pad"
          />
          <TouchableOpacity style={styles.stepperBtn} onPress={() => modificaNumeroRate(1)}>
            <Text style={styles.stepperBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        {importiAnteprima.length > 0 ? (
          <View style={styles.anteprimaBox}>
            <Text style={styles.anteprimaTitle}>Anteprima rate</Text>
            <Text style={styles.anteprimaRow}>
              {`${numRate} rate da \u20AC${formatImportoEuro(importiAnteprima[0], 2)}`}
            </Text>
            {importiAnteprima[importiAnteprima.length - 1] !== importiAnteprima[0] ? (
              <Text style={styles.anteprimaRow}>
                {`Ultima rata: \u20AC${formatImportoEuro(importiAnteprima[importiAnteprima.length - 1], 2)}`}
              </Text>
            ) : null}
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.creaBtn, (salvando || importoTotale <= 0 || numRate < 2) && styles.creaBtnDisabled]}
          onPress={onCreaPiano}
          disabled={salvando || importoTotale <= 0 || numRate < 2}
        >
          {salvando
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.creaBtnText}>Crea piano a rate</Text>}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  center: { alignItems: 'center', paddingTop: 40 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#0D1B2A' },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.8 },
  readonlyBox: { backgroundColor: '#F7F8FA', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 12 },
  readonlyValue: { fontSize: 16, fontWeight: '600', color: '#0D1B2A' },
  input: { backgroundColor: '#F7F8FA', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 12, fontSize: 14, color: '#0D1B2A' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepperBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F7F8FA', borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  stepperBtnText: { fontSize: 20, color: '#0D1B2A', fontWeight: '600' },
  stepperInput: { flex: 1, textAlign: 'center', backgroundColor: '#F7F8FA', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 12, fontSize: 16, fontWeight: '600', color: '#0D1B2A' },
  anteprimaBox: { backgroundColor: '#F7F8FA', borderRadius: 12, padding: 12, gap: 6 },
  anteprimaTitle: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  anteprimaRow: { fontSize: 13, color: '#0D1B2A' },
  creaBtn: { backgroundColor: '#0D1B2A', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 4 },
  creaBtnDisabled: { opacity: 0.5 },
  creaBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  pianoHeader: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center', gap: 12 },
  pianoHeaderTitle: { fontSize: 15, fontWeight: '700', color: '#0D1B2A' },
  pianoHeaderSub: { fontSize: 13, color: '#374151', marginTop: 4 },
  pianoHeaderHint: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  pianoBody: { gap: 10 },
  progressTrack: { height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: '#0E9F8E', borderRadius: 4 },
  section: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#F7F8FA' },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: '#6B7280', letterSpacing: 0.6, textTransform: 'uppercase' },
  sectionArrow: { fontSize: 10, color: '#9CA3AF' },
  rataMiniTab: { borderTopWidth: 1, borderTopColor: '#F3F4F6', padding: 12 },
  rataMiniRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rataMiniTitolo: { fontSize: 13, fontWeight: '500', color: '#0D1B2A' },
  rataMiniImporto: { fontSize: 13, fontWeight: '600', color: '#0D1B2A' },
  rataMiniDetail: { marginTop: 10, gap: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { fontSize: 13, color: '#374151', fontWeight: '500' },
  reminderBtn: { borderWidth: 1, borderColor: '#25D366', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  reminderBtnText: { color: '#25D366', fontSize: 13, fontWeight: '600' },
  abAzioneBtn: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  abAzioneBtnText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  abAzioneBtnPrimary: { backgroundColor: '#0D1B2A', borderColor: '#0D1B2A' },
  abAzioneBtnPrimaryText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  modificaBox: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', padding: 14, gap: 10, marginTop: 4 },
  modificaActions: { flexDirection: 'row', gap: 8 },
})
