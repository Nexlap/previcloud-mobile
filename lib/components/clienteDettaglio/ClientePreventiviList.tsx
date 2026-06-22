import { useEffect, useRef, type ReactNode } from 'react'
import { Alert, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { LongPressAwarePressable } from '../LongPressAwarePressable'
import type { VoceMenuAzione } from '../MenuAzioniSheet'
import { mostraMenuAzioniAlert } from '../../utils/mostraMenuAzioniAlert'
import type { PreventivoInvio } from '../../api/firma'
import { PreventivoCardAzioni } from '../preventivo/PreventivoCardAzioni'
import { preventivoCardRowStyles } from '../preventivo/preventivoCardStyles'
import { RipristinaVersioneLink } from '../preventivo/RipristinaVersioneLink'
import { FirmaStatoBadge, mostraPulsanteInviaFirma } from '../firma/FirmaStatoBadge'
import { registraFirmaManuale, statoFirmaInvio } from '../../api/firma'
import { Preventivo } from '../../types'
import { formatImportoDb } from 'preventivoai-shared'
import { IconLabel } from '../icons/IconLabel'
import { errorMessage } from '../../utils/errors'

type Props = {
  preventivi: Preventivo[]
  selezione: string[]
  modalitaSelezione: boolean
  aperto: string | null
  cronologiaAperta: string | null
  cronologia: { [key: string]: Preventivo[] }
  cronologiaVersioneAperta: string | null
  collegamentiPiano?: Record<string, 'canone' | 'rate'>
  onToggleCard: (preventivoId: string) => void
  onLongPress: (preventivoId: string) => void
  onStatoPress: (preventivoId: string) => void
  onScaricaPdf: (preventivo: Preventivo) => void
  onElimina: (preventivoId: string) => void
  onCaricaCronologia: (preventivoId: string, padreId: string | null) => void
  onToggleVersione: (versioneId: string) => void
  onRipristinaVersione: (preventivoCorrenteId: string, versione: Preventivo) => void
  onModificaUltimo: (preventivo: Preventivo) => void
  onSposta: (preventivoId: string) => void
  onRinomina: (preventivo: Preventivo) => void
  inviiFirma?: Record<string, PreventivoInvio>
  onInviaFirma?: (preventivo: Preventivo) => void
  onApriFirmaDettaglio?: (preventivo: Preventivo) => void
  ricaricaInviiFirma?: () => void
  onDopoFirmaManuale?: (preventivoId: string) => void
  highlightPreventivoId?: string | null
  onHighlightFinished?: () => void
  onPreventivoRowLayout?: (preventivoId: string, y: number) => void
}

type PreventivoCardShellProps = {
  preventivoId: string
  highlighted: boolean
  selected: boolean
  isOld: boolean
  onHighlightFinished?: () => void
  onRowLayout?: (preventivoId: string, y: number) => void
  children: ReactNode
}

function PreventivoCardShell({
  preventivoId,
  highlighted,
  selected,
  isOld,
  onHighlightFinished,
  onRowLayout,
  children,
}: PreventivoCardShellProps) {
  const highlightAnim = useRef(new Animated.Value(0)).current
  const highlightStarted = useRef(false)

  useEffect(() => {
    if (!highlighted) {
      highlightStarted.current = false
      highlightAnim.setValue(0)
      return
    }
    if (highlightStarted.current) return
    highlightStarted.current = true
    highlightAnim.setValue(1)
    Animated.timing(highlightAnim, {
      toValue: 0,
      duration: 800,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) onHighlightFinished?.()
    })
  }, [highlighted, highlightAnim, onHighlightFinished])

  const backgroundColor = highlighted
    ? highlightAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['#fff', 'rgba(14, 159, 142, 0.18)'],
    })
    : '#fff'

  const borderColor = highlighted
    ? highlightAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['#E5E7EB', 'rgba(14, 159, 142, 0.55)'],
    })
    : selected
      ? '#0E9F8E'
      : '#E5E7EB'

  return (
    <Animated.View
      onLayout={(e) => onRowLayout?.(preventivoId, e.nativeEvent.layout.y)}
      style={[
        styles.prevCard,
        isOld && styles.prevCardOld,
        selected && !highlighted && styles.prevCardSelected,
        highlighted && styles.prevCardHighlight,
        { backgroundColor, borderColor },
      ]}
    >
      {children}
    </Animated.View>
  )
}

export function ClientePreventiviList({
  preventivi,
  selezione,
  modalitaSelezione,
  aperto,
  cronologiaAperta,
  cronologia,
  cronologiaVersioneAperta,
  onToggleCard,
  onLongPress,
  onStatoPress,
  onScaricaPdf,
  onElimina,
  onCaricaCronologia,
  onToggleVersione,
  onRipristinaVersione,
  onModificaUltimo,
  onSposta,
  onRinomina,
  collegamentiPiano = {},
  inviiFirma = {},
  onInviaFirma,
  onApriFirmaDettaglio,
  ricaricaInviiFirma,
  onDopoFirmaManuale,
  highlightPreventivoId = null,
  onHighlightFinished,
  onPreventivoRowLayout,
}: Props) {
  function segnaFirmatoSuCarta(p: Preventivo) {
    Alert.alert(
      'Firma su carta',
      'Segnare questo preventivo come firmato su carta? Non verrà inviato alcun link online.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Segna firmato',
          onPress: () => {
            void (async () => {
              try {
                await registraFirmaManuale(p.id)
                ricaricaInviiFirma?.()
                onDopoFirmaManuale?.(p.id)
              } catch (err: unknown) {
                Alert.alert('Errore', errorMessage(err, 'Operazione non riuscita.'))
              }
            })()
          },
        },
      ],
    )
  }

  function vociMenu(p: Preventivo): VoceMenuAzione[] {
    const sfFirma = statoFirmaInvio(inviiFirma[p.id])
    const voci: VoceMenuAzione[] = []
    if (p.is_ultimo) {
      voci.push(
        { label: 'Modifica preventivo', onPress: () => onModificaUltimo(p) },
        { label: 'Genera versione alternativa', onPress: () => onModificaUltimo(p) },
      )
    }
    voci.push(
      { label: 'Rinomina', onPress: () => onRinomina(p) },
      { label: 'Sposta', onPress: () => onSposta(p.id) },
    )
    if (p.pdf_url && sfFirma === 'nessuno') {
      voci.push({ label: 'Segna firmato su carta', onPress: () => segnaFirmatoSuCarta(p) })
    }
    voci.push({ label: 'Elimina', onPress: () => onElimina(p.id), danger: true })
    return voci
  }

  function apriMenuPreventivo(p: Preventivo) {
    mostraMenuAzioniAlert(vociMenu(p), p.titolo || 'Preventivo')
  }

  if (preventivi.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Nessun preventivo per questo cliente</Text>
      </View>
    )
  }

  return (
    <>
      {preventivi.map(p => {
        const invio = inviiFirma[p.id]
        const sfFirma = statoFirmaInvio(invio)
        const mostraInvia = mostraPulsanteInviaFirma(p.pdf_url, invio)
        return (
        <PreventivoCardShell
          key={p.id}
          preventivoId={p.id}
          highlighted={highlightPreventivoId === p.id}
          selected={selezione.includes(p.id)}
          isOld={!p.is_ultimo}
          onHighlightFinished={onHighlightFinished}
          onRowLayout={onPreventivoRowLayout}
        >
        <LongPressAwarePressable
          style={styles.prevCardInner}
          onPress={() => onToggleCard(p.id)}
          onLongPress={() => onLongPress(p.id)}
        >
          <View style={preventivoCardRowStyles.row}>
            {modalitaSelezione && (
              <View style={[styles.checkCircle, selezione.includes(p.id) && styles.checkCircleActive]}>
                {selezione.includes(p.id) && <Text style={styles.checkMark}>{'\u2713'}</Text>}
              </View>
            )}
            <View style={preventivoCardRowStyles.left}>
              <Text style={styles.prevVersione}>{p.titolo || 'Preventivo'}</Text>
              <Text style={styles.prevData}>
                {`${new Date(p.created_at).toLocaleDateString('it-IT')}${p.is_ultimo ? ' · attivo' : ''}`}
              </Text>
              {collegamentiPiano[p.id] ? (
                <View style={styles.prevPianoBadge}>
                  <IconLabel
                    icon={collegamentiPiano[p.id] === 'rate' ? 'calendar' : 'repeat'}
                    label={collegamentiPiano[p.id] === 'rate' ? 'Piano a rate collegato' : 'Abbonamento collegato'}
                    color="#0E9F8E"
                    textStyle={{ fontSize: 11, fontWeight: '600' }}
                  />
                </View>
              ) : null}
              <FirmaStatoBadge
                invio={invio}
                onPress={
                  modalitaSelezione
                    ? () => onToggleCard(p.id)
                    : sfFirma !== 'nessuno' && onApriFirmaDettaglio
                      ? () => onApriFirmaDettaglio(p)
                      : undefined
                }
                onLongPress={!modalitaSelezione ? () => onLongPress(p.id) : undefined}
              />
            </View>
            <PreventivoCardAzioni
              preventivo={p}
              collegamentoPiano={!!collegamentiPiano[p.id]}
              mostraInvia={mostraInvia}
              modalitaSelezione={modalitaSelezione}
              selezionato={selezione.includes(p.id)}
              onStatoPress={() => onStatoPress(p.id)}
              onToggleSelezione={() => onToggleCard(p.id)}
              onLongPress={() => onLongPress(p.id)}
              onScaricaPdf={() => onScaricaPdf(p)}
              onInviaFirma={onInviaFirma ? () => onInviaFirma(p) : undefined}
              onMenu={() => apriMenuPreventivo(p)}
            />
          </View>

          {aperto === p.id && p.testo_preventivo && !modalitaSelezione && (
            <View style={styles.prevDetail}>
              <Text style={styles.prevTesto}>{p.testo_preventivo}</Text>
              {p.versione && p.versione > 1 && (
                <TouchableOpacity style={styles.cronologiaBtn} onPress={() => onCaricaCronologia(p.id, p.preventivo_padre_id)}>
                  <Text style={styles.cronologiaBtnText}>
                    {cronologiaAperta === p.id ? '▲ Nascondi cronologia' : `▼ Mostra cronologia (${p.versione - 1} vers. precedenti)`}
                  </Text>
                </TouchableOpacity>
              )}
              {cronologiaAperta === p.id && cronologia[p.id]?.map(v => (
                <View key={v.id}>
                  <TouchableOpacity style={styles.cronologiaItem} onPress={() => onToggleVersione(v.id)}>
                    <Text style={styles.cronologiaVer}>v{v.versione || 1}</Text>
                    <Text style={styles.cronologiaData}>{new Date(v.created_at).toLocaleDateString('it-IT')}</Text>
                    <Text style={styles.cronologiaImporto}>{v.importo_totale ? `\u20AC${formatImportoDb(v.importo_totale)}` : '—'}</Text>
                  </TouchableOpacity>
                  {cronologiaVersioneAperta === v.id && (
                    <View style={styles.cronologiaDetail}>
                      <Text style={styles.prevTesto}>{v.testo_preventivo}</Text>
                      <RipristinaVersioneLink
                        versione={v}
                        onRipristina={() => onRipristinaVersione(p.id, v)}
                      />
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </LongPressAwarePressable>
        </PreventivoCardShell>
        )
      })}
    </>
  )
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 14, color: '#9CA3AF', marginBottom: 12 },
  prevCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  prevCardHighlight: { borderWidth: 1.5 },
  prevCardInner: { overflow: 'hidden' },
  prevCardOld: { opacity: 0.6 },
  prevCardSelected: { borderColor: '#0E9F8E', borderWidth: 2 },
  prevVersione: { fontSize: 13, fontWeight: '700', color: '#0D1B2A' },
  prevData: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  prevPianoBadge: { marginTop: 4 },
  prevDetail: { padding: 14, borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 10 },
  prevTesto: { fontSize: 12, color: '#6B7280', lineHeight: 18, fontFamily: 'monospace' },
  cronologiaBtn: { paddingVertical: 8, alignItems: 'center' },
  cronologiaBtnText: { fontSize: 13, color: '#0E9F8E', fontWeight: '500' },
  cronologiaItem: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#F7F8FA', borderRadius: 8, padding: 10 },
  cronologiaVer: { fontSize: 13, fontWeight: '700', color: '#9CA3AF' },
  cronologiaData: { fontSize: 12, color: '#9CA3AF' },
  cronologiaImporto: { fontSize: 12, color: '#9CA3AF' },
  cronologiaDetail: { backgroundColor: '#F7F8FA', borderRadius: 10, padding: 12, gap: 10 },
  checkCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#D1D5DB', marginRight: 8, justifyContent: 'center', alignItems: 'center' },
  checkCircleActive: { backgroundColor: '#0E9F8E', borderColor: '#0E9F8E' },
  checkMark: { color: '#fff', fontSize: 14, fontWeight: '700' },
})
