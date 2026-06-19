import { useMemo, useState } from 'react'
import {
  ActivityIndicator, Alert, Linking, Platform, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
  type DimensionValue,
} from 'react-native'
import { LongPressAwarePressable } from '../LongPressAwarePressable'
import { MenuAzioniSheet, type VoceMenuAzione } from '../MenuAzioniSheet'
import { sessioneClienteDettaglio } from '../../api/clienteDettaglio'
import { creaLinkPagamentoRata } from '../../api/pdf'
import { MESI_BREVI } from '../../constants'
import { Abbonamento, PreventivoMadre, RataAbbonamento } from '../../types'
import { errorMessage } from '../../utils/errors'
import { formatImportoEuro, parseImportoEuro, ricalcolaImportiRateLibere } from '../../utils/importo'
import { titoloHeaderPiano } from '../../utils/preventivoMadre'
import { analizzaStatoPiano } from '../../utils/statoPiano'
import { PianoStatoBadge } from './PianoStatoBadge'
import { PreventivoMadreLink } from './PreventivoMadreLink'

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

export type PianoRateCardProps = {
  abbonamento: Abbonamento
  rate: RataAbbonamento[]
  preventivoMadre: PreventivoMadre | null
  clienteNome: string
  onApriPreventivoMadre?: (preventivoId: string) => void
  onCampoFocus?: () => void
  onPianoAggiornato?: () => void | Promise<void>
  segnaRataPagata: (rataId: string, pagata: boolean) => void
  modificaImportoPianoRate: (abbonamentoId: string, importo: number) => Promise<boolean>
  salvaImportiRatePersonalizzati: (abbonamentoId: string, importi: Record<string, number>) => Promise<boolean>
  eliminaAbbonamento: (abbonamentoId: string) => Promise<void>
  onRename?: () => void
  selezionePianoAttiva?: boolean
  pianoSelezionato?: boolean
  onAvviaSelezionePiano?: (abbonamentoId: string) => void
  onToggleSelezionePiano?: (abbonamentoId: string) => void
}

export function PianoRateCard({
  abbonamento,
  rate,
  preventivoMadre,
  clienteNome,
  onApriPreventivoMadre,
  onCampoFocus,
  onPianoAggiornato,
  segnaRataPagata,
  modificaImportoPianoRate,
  salvaImportiRatePersonalizzati,
  eliminaAbbonamento,
  onRename,
  selezionePianoAttiva = false,
  pianoSelezionato = false,
  onAvviaSelezionePiano,
  onToggleSelezionePiano,
}: PianoRateCardProps) {
  const [invioReminderLoading, setInvioReminderLoading] = useState<string | null>(null)
  const [pianoEspanso, setPianoEspanso] = useState(false)
  const [futureAperte, setFutureAperte] = useState(true)
  const [storicoAperto, setStoricoAperto] = useState(false)
  const [rataMiniAperta, setRataMiniAperta] = useState<string | null>(null)
  const [modificaImporto, setModificaImporto] = useState(false)
  const [personalizzaRate, setPersonalizzaRate] = useState(false)
  const [bozzaImporti, setBozzaImporti] = useState<Record<string, string>>({})
  const [ratePinnate, setRatePinnate] = useState<Record<string, boolean>>({})
  const [nuovoImportoTotale, setNuovoImportoTotale] = useState('')
  const [salvaImportoLoading, setSalvaImportoLoading] = useState(false)
  const [salvaPersonalizzaLoading, setSalvaPersonalizzaLoading] = useState(false)
  const [menuAperto, setMenuAperto] = useState(false)

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
  const importoRaccolto = useMemo(() => {
    const incassato = rate
      .filter(r => r.stato === 'incassato')
      .reduce((a, r) => a + r.importo, 0)
    const parziale = rate
      .filter(r => r.stato === 'parziale')
      .reduce((a, r) => a + (r.acconto || 0), 0)
    return incassato + parziale
  }, [rate])
  const analisi = useMemo(() => analizzaStatoPiano(abbonamento, rate), [abbonamento, rate])
  const prossima = rateFuture[0]
  const targetImportoPiano = abbonamento.importo_default ?? importoPiano
  const sommaIncassateFisse = rateStorico.reduce((a, r) => a + r.importo, 0)
  const sommaBozzaModificabili = rateFuture.reduce((a, r) => {
    const parsed = parseImportoEuro(bozzaImporti[r.id] ?? '')
    return a + (parsed ?? 0)
  }, 0)
  const sommaBozzaTotale = Math.round((sommaIncassateFisse + sommaBozzaModificabili) * 100) / 100
  const bozzaImportiValidi = rateFuture.every(r => {
    const parsed = parseImportoEuro(bozzaImporti[r.id] ?? '')
    return parsed !== null && parsed > 0 && parsed >= (r.acconto || 0)
  })
  const bozzaSommaValida = Math.abs(sommaBozzaTotale - targetImportoPiano) <= 0.01
  const rateLibereCount = rateFuture.filter(r => !rataBloccataInPersonalizza(r) && !ratePinnate[r.id]).length

  function rataBloccataInPersonalizza(rata: RataAbbonamento) {
    return rata.stato === 'incassato' || (rata.acconto || 0) > 0
  }

  function rataPinnataEffettiva(rata: RataAbbonamento) {
    return rataBloccataInPersonalizza(rata) || !!ratePinnate[rata.id]
  }

  function togglePinRata(rata: RataAbbonamento) {
    if (rataBloccataInPersonalizza(rata)) return
    setRatePinnate(p => ({ ...p, [rata.id]: !p[rata.id] }))
  }

  function focusCampoInput() {
    onCampoFocus?.()
  }

  function apriPersonalizzaRate() {
    const bozza: Record<string, string> = {}
    for (const r of rateFuture) {
      bozza[r.id] = String(r.importo).replace('.', ',')
    }
    setBozzaImporti(bozza)
    setRatePinnate({})
    setPersonalizzaRate(true)
    setModificaImporto(false)
    setPianoEspanso(true)
    setTimeout(focusCampoInput, Platform.OS === 'ios' ? 150 : 300)
  }

  function ricalcolaRateLibere() {
    const rateModificabili = rateFuture.map(r => ({
      id: r.id,
      pinnata: rataPinnataEffettiva(r),
      importoBozza: parseImportoEuro(bozzaImporti[r.id] ?? ''),
      accontoMinimo: r.acconto || 0,
    }))

    const result = ricalcolaImportiRateLibere(targetImportoPiano, sommaIncassateFisse, rateModificabili)
    if (!result.ok) {
      Alert.alert('Ricalcolo non possibile', result.messaggio)
      return
    }

    setBozzaImporti(b => {
      const next = { ...b }
      for (const r of rateFuture) {
        if (!rataPinnataEffettiva(r) && result.importi[r.id] !== undefined) {
          next[r.id] = String(result.importi[r.id]).replace('.', ',')
        }
      }
      return next
    })
  }

  async function salvaPersonalizzaRate() {
    const importi: Record<string, number> = {}
    for (const r of rateFuture) {
      const parsed = parseImportoEuro(bozzaImporti[r.id] ?? '')
      if (parsed === null) {
        Alert.alert('Importo non valido', 'Controlla gli importi inseriti.')
        return
      }
      importi[r.id] = parsed
    }
    setSalvaPersonalizzaLoading(true)
    const ok = await salvaImportiRatePersonalizzati(abbonamento.id, importi)
    setSalvaPersonalizzaLoading(false)
    if (ok) {
      setPersonalizzaRate(false)
      await onPianoAggiornato?.()
    }
  }

  async function inviaReminder(rata: RataAbbonamento) {
    try {
      setInvioReminderLoading(rata.id)
      const session = await sessioneClienteDettaglio()
      if (!session) return
      const residuo = rata.importo - (rata.acconto || 0)
      const link = await creaLinkPagamentoRata(rata.id, clienteNome, session.access_token)
      const testo = `Ciao ${clienteNome}, ti ricordo il pagamento di \u20AC${formatImportoEuro(residuo, 2)} per la rata di ${MESI_FULL[rata.mese - 1]} ${rata.anno}. Puoi pagare qui: ${link}`
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

  function apriModificaImporto() {
    setNuovoImportoTotale(String(abbonamento.importo_default ?? importoPiano))
    setModificaImporto(true)
    setPersonalizzaRate(false)
    setPianoEspanso(true)
    setTimeout(focusCampoInput, Platform.OS === 'ios' ? 150 : 300)
  }

  async function salvaModificaImporto() {
    const val = parseFloat(nuovoImportoTotale.replace(',', '.'))
    if (!(val > 0)) {
      Alert.alert('Importo non valido', 'Inserisci un importo maggiore di zero.')
      return
    }
    setSalvaImportoLoading(true)
    const ok = await modificaImportoPianoRate(abbonamento.id, val)
    setSalvaImportoLoading(false)
    if (ok) {
      setModificaImporto(false)
      Alert.alert('Importo aggiornato', 'Le rate non ancora pagate sono state ricalcolate.')
    }
  }

  function confermaEliminaPiano() {
    Alert.alert(
      'Elimina piano a rate',
      'Il piano verrà disattivato e non sarà più collegato al preventivo.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            await eliminaAbbonamento(abbonamento.id)
            await onPianoAggiornato?.()
            setModificaImporto(false)
            setPianoEspanso(false)
          },
        },
      ],
    )
  }

  function vociMenu(): VoceMenuAzione[] {
    return [
      { label: 'Rinomina', onPress: () => onRename?.(), hidden: !onRename },
      { label: 'Modifica importo', onPress: apriModificaImporto },
      { label: 'Personalizza rate', onPress: apriPersonalizzaRate, hidden: rateFuture.length === 0 },
      { label: 'Elimina piano', onPress: confermaEliminaPiano, danger: true },
    ]
  }

  return (
    <View style={styles.container}>
      <LongPressAwarePressable
        style={[
          styles.pianoHeader,
          pianoSelezionato && styles.pianoHeaderSelected,
          analisi.concluso && styles.pianoHeaderConcluso,
        ]}
        onPress={() => {
          if (selezionePianoAttiva) {
            onToggleSelezionePiano?.(abbonamento.id)
            return
          }
          setPianoEspanso(v => {
            if (v) {
              setModificaImporto(false)
              setPersonalizzaRate(false)
            }
            return !v
          })
        }}
        onLongPress={() => onAvviaSelezionePiano?.(abbonamento.id)}
      >
        {selezionePianoAttiva ? (
          <View style={[styles.checkCircle, pianoSelezionato && styles.checkCircleActive]}>
            {pianoSelezionato ? <Text style={styles.checkMark}>{'\u2713'}</Text> : null}
          </View>
        ) : null}
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.pianoHeaderTitleRow}>
            <Text style={styles.pianoHeaderTitle} numberOfLines={1} ellipsizeMode="tail">
              {titoloHeaderPiano(abbonamento.nome, preventivoMadre, 'rate', 'Piano a rate')}
            </Text>
            {!selezionePianoAttiva ? <PianoStatoBadge analisi={analisi} compact /> : null}
          </View>
          <Text style={styles.pianoHeaderSub}>
            {analisi.concluso
              ? `${rate.length}/${rate.length} rate pagate \u00B7 \u20AC${formatImportoEuro(importoRaccolto, 2)} raccolti`
              : `${ratePagate}/${rate.length} rate pagate \u00B7 \u20AC${formatImportoEuro(importoRaccolto, 2)} su \u20AC${formatImportoEuro(importoPiano, 2)}`}
          </Text>
          {analisi.sottotitolo ? (
            <Text style={[styles.pianoHeaderHint, analisi.concluso && styles.pianoHeaderHintConcluso]}>
              {analisi.sottotitolo}
            </Text>
          ) : null}
        </View>
        {!selezionePianoAttiva ? (
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <TouchableOpacity hitSlop={8} onPress={() => setMenuAperto(true)}>
              <Text style={styles.menuPuntini}>{'\u22EE'}</Text>
            </TouchableOpacity>
            <Text style={styles.sectionArrow}>{pianoEspanso ? '\u25B2' : '\u25BC'}</Text>
          </View>
        ) : null}
      </LongPressAwarePressable>

      <MenuAzioniSheet
        visible={menuAperto}
        voci={vociMenu()}
        onClose={() => setMenuAperto(false)}
      />

      {pianoEspanso && !selezionePianoAttiva ? (
        <View style={styles.pianoBody}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                analisi.concluso && styles.progressFillConcluso,
                { width: `${Math.min(100, analisi.progressoPct)}%` as DimensionValue },
              ]}
            />
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

          {personalizzaRate ? (
            <View style={styles.modificaBox}>
              <Text style={styles.fieldLabel}>IMPORTO PER RATA</Text>
              <Text style={styles.personalizzaHint}>
                {`Fissa le rate che vuoi impostare tu (es. \u20AC200), poi usa Ricalcola rate libere per ripartire il resto su \u20AC${formatImportoEuro(targetImportoPiano, 2)}.`}
              </Text>
              {rateOrdinate.map((rata, index) => {
                const pagata = rata.stato === 'incassato'
                const bloccataAcconto = !pagata && (rata.acconto || 0) > 0
                const pinnata = rataPinnataEffettiva(rata)
                return (
                  <View key={rata.id} style={styles.personalizzaRiga}>
                    <Text style={styles.personalizzaLabel}>{`Rata ${index + 1} \u00B7 ${labelScadenza(rata)}`}</Text>
                    {pagata ? (
                      <Text style={styles.personalizzaLocked}>{`\u20AC${formatImportoEuro(rata.importo, 2)}`}</Text>
                    ) : (
                      <>
                        <TextInput
                          style={[
                            styles.personalizzaInput,
                            pinnata ? styles.personalizzaInputPinned : null,
                          ]}
                          value={bozzaImporti[rata.id] ?? ''}
                          onChangeText={v => setBozzaImporti(b => ({ ...b, [rata.id]: v }))}
                          onFocus={focusCampoInput}
                          keyboardType="decimal-pad"
                          placeholder="0"
                          placeholderTextColor="#9CA3AF"
                        />
                        <TouchableOpacity
                          style={[styles.pinBtn, pinnata && styles.pinBtnActive]}
                          onPress={() => togglePinRata(rata)}
                          disabled={bloccataAcconto}
                        >
                          <Text style={[styles.pinBtnText, pinnata && styles.pinBtnTextActive]}>
                            {bloccataAcconto ? 'Acconto' : pinnata ? 'Fissa' : 'Libera'}
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )
              })}
              <Text style={[
                styles.personalizzaSomma,
                bozzaSommaValida && bozzaImportiValidi ? styles.personalizzaSommaOk : styles.personalizzaSommaErr,
              ]}>
                {`Somma: \u20AC${formatImportoEuro(sommaBozzaTotale, 2)} / \u20AC${formatImportoEuro(targetImportoPiano, 2)}`}
              </Text>
              <TouchableOpacity
                style={[styles.ricalcolaBtn, rateLibereCount === 0 && styles.ricalcolaBtnDisabled]}
                onPress={ricalcolaRateLibere}
                disabled={rateLibereCount === 0}
              >
                <Text style={styles.ricalcolaBtnText}>Ricalcola rate libere</Text>
              </TouchableOpacity>
              <View style={styles.modificaActions}>
                <TouchableOpacity style={styles.abAzioneBtn} onPress={() => setPersonalizzaRate(false)}>
                  <Text style={styles.abAzioneBtnText}>Annulla</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.abAzioneBtn, styles.abAzioneBtnPrimary]}
                  onPress={salvaPersonalizzaRate}
                  disabled={salvaPersonalizzaLoading || !bozzaSommaValida || !bozzaImportiValidi}
                >
                  {salvaPersonalizzaLoading
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.abAzioneBtnPrimaryText}>Salva rate</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ) : modificaImporto ? (
            <View style={styles.modificaBox}>
              <Text style={styles.fieldLabel}>NUOVO IMPORTO TOTALE</Text>
              <TextInput
                style={styles.input}
                value={nuovoImportoTotale}
                onChangeText={setNuovoImportoTotale}
                onFocus={focusCampoInput}
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
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleActive: { backgroundColor: '#0E9F8E', borderColor: '#0E9F8E' },
  checkMark: { color: '#fff', fontSize: 12, fontWeight: '700' },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.8 },
  input: { backgroundColor: '#F7F8FA', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 12, fontSize: 14, color: '#0D1B2A' },
  pianoHeader: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center', gap: 12 },
  pianoHeaderSelected: { borderColor: '#0E9F8E', backgroundColor: '#F0FDF4' },
  pianoHeaderConcluso: { borderColor: '#A7F3D0', backgroundColor: '#F0FDF4' },
  pianoHeaderTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  pianoHeaderTitle: { fontSize: 15, fontWeight: '700', color: '#0D1B2A', flexShrink: 1 },
  pianoHeaderSub: { fontSize: 13, color: '#374151', marginTop: 4 },
  pianoHeaderHint: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  pianoHeaderHintConcluso: { color: '#047857', fontWeight: '500' },
  pianoBody: { gap: 10 },
  progressTrack: { height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: '#0E9F8E', borderRadius: 4 },
  progressFillConcluso: { backgroundColor: '#047857' },
  section: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#F7F8FA' },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: '#6B7280', letterSpacing: 0.6, textTransform: 'uppercase' },
  sectionArrow: { fontSize: 10, color: '#9CA3AF' },
  menuPuntini: { fontSize: 22, color: '#9CA3AF', lineHeight: 24 },
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
  personalizzaHint: { fontSize: 12, color: '#6B7280', lineHeight: 18 },
  personalizzaRiga: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  personalizzaLabel: { flex: 1, fontSize: 13, color: '#374151', fontWeight: '500' },
  personalizzaInput: {
    width: 88,
    textAlign: 'right',
    backgroundColor: '#F7F8FA',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#0D1B2A',
  },
  personalizzaInputPinned: { borderColor: '#0E9F8E', backgroundColor: '#ECFDF5' },
  pinBtn: {
    minWidth: 52,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  pinBtnActive: { borderColor: '#0E9F8E', backgroundColor: '#ECFDF5' },
  pinBtnText: { fontSize: 11, fontWeight: '600', color: '#9CA3AF' },
  pinBtnTextActive: { color: '#0E9F8E' },
  ricalcolaBtn: {
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#0E9F8E',
    backgroundColor: '#ECFDF5',
  },
  ricalcolaBtnDisabled: { opacity: 0.45 },
  ricalcolaBtnText: { fontSize: 13, fontWeight: '600', color: '#0E9F8E' },
  personalizzaLocked: { width: 96, textAlign: 'right', fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
  personalizzaSomma: { fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 4 },
  personalizzaSommaOk: { color: '#0E9F8E' },
  personalizzaSommaErr: { color: '#EF4444' },
  personalizzaBtn: { backgroundColor: '#0D1B2A', borderRadius: 10, padding: 12, alignItems: 'center' },
  personalizzaBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  modificaActions: { flexDirection: 'row', gap: 8 },
})
