import { useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { eventBus } from '../../eventBus'
import { useAbbonamento } from '../../hooks/useAbbonamento'
import { Abbonamento } from '../../types'
import { analizzaStatoPiano, ordinaPianiPerStato } from '../../utils/statoPiano'
import { PianoRateCard } from './PianoRateCard'
import { PianoVuotoState } from './PianoVuotoState'

export function ClientePagamentoRateTab({
  onApriPreventivoMadre,
  onPianoAggiornato,
  onCampoFocus,
  onRename,
  selezionePianoAttiva = false,
  pianiSelezionati = [],
  onAvviaSelezionePiano,
  onToggleSelezionePiano,
}: {
  onApriPreventivoMadre?: (preventivoId: string) => void
  onPianoAggiornato?: () => void | Promise<void>
  onCampoFocus?: () => void
  onRename?: (abbonamentoId: string, defaultNome: string) => void
  selezionePianoAttiva?: boolean
  pianiSelezionati?: string[]
  onAvviaSelezionePiano?: (abbonamentoId: string) => void
  onToggleSelezionePiano?: (abbonamentoId: string) => void
}) {
  const { id: clienteId, nome: clienteNome } = useLocalSearchParams<{ id: string; nome?: string }>()
  const {
    abbonamentiAttivi,
    ratePerPiano,
    preventiviMadreStorico,
    loading: loadingAb,
    segnaRataPagata,
    modificaImportoPianoRate,
    salvaImportiRatePersonalizzati,
    eliminaAbbonamento,
    carica,
  } = useAbbonamento(clienteId || '', { soloTipo: 'rate' })

  useEffect(() => {
    const aggiorna = () => { carica() }
    eventBus.on('aggiorna-piano-cliente', aggiorna)
    return () => { eventBus.off('aggiorna-piano-cliente', aggiorna) }
  }, [carica])

  const pianiOrdinati = useMemo(
    () => ordinaPianiPerStato(abbonamentiAttivi, ratePerPiano, id => abbonamentiAttivi.find(a => a.id === id)),
    [abbonamentiAttivi, ratePerPiano],
  )

  const pianiInCorso = useMemo(
    () => pianiOrdinati.filter(a => !analizzaStatoPiano(a, ratePerPiano[a.id] || []).concluso),
    [pianiOrdinati, ratePerPiano],
  )
  const pianiConclusi = useMemo(
    () => pianiOrdinati.filter(a => analizzaStatoPiano(a, ratePerPiano[a.id] || []).concluso),
    [pianiOrdinati, ratePerPiano],
  )

  function renderPianoCard(abbonamento: Abbonamento) {
    return (
      <PianoRateCard
        key={abbonamento.id}
        abbonamento={abbonamento}
        rate={ratePerPiano[abbonamento.id] || []}
        preventivoMadre={
          abbonamento.preventivo_id
            ? preventiviMadreStorico[abbonamento.preventivo_id] ?? null
            : null
        }
        clienteNome={clienteNome || ''}
        onApriPreventivoMadre={onApriPreventivoMadre}
        onCampoFocus={onCampoFocus}
        onPianoAggiornato={onPianoAggiornato}
        segnaRataPagata={segnaRataPagata}
        modificaImportoPianoRate={modificaImportoPianoRate}
        salvaImportiRatePersonalizzati={salvaImportiRatePersonalizzati}
        eliminaAbbonamento={eliminaAbbonamento}
        onRename={onRename ? () => onRename(abbonamento.id, abbonamento.nome || 'Piano a rate') : undefined}
        selezionePianoAttiva={selezionePianoAttiva}
        pianoSelezionato={pianiSelezionati.includes(abbonamento.id)}
        onAvviaSelezionePiano={onAvviaSelezionePiano}
        onToggleSelezionePiano={onToggleSelezionePiano}
      />
    )
  }

  if (loadingAb) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0E9F8E" />
      </View>
    )
  }

  if (abbonamentiAttivi.length === 0) {
    return (
      <PianoVuotoState
        icon="calendar"
        title="Nessun piano a rate"
        description="Suddividi l'importo di un preventivo in rate mensili con scadenze, promemoria e tracciamento degli incassi."
      />
    )
  }

  return (
    <View style={styles.container}>
      {pianiInCorso.map(renderPianoCard)}
      {pianiConclusi.length > 0 ? (
        <>
          <Text style={styles.sezioneConclusiLabel}>
            {pianiConclusi.length === 1 ? 'Concluso' : `Conclusi (${pianiConclusi.length})`}
          </Text>
          {pianiConclusi.map(renderPianoCard)}
        </>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  center: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 24 },
  sezioneConclusiLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: -4,
  },
})
