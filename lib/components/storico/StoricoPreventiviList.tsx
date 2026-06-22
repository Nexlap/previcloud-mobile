import { Text, TouchableOpacity, View } from 'react-native'
import { LongPressAwarePressable } from '../LongPressAwarePressable'
import type { VoceMenuAzione } from '../MenuAzioniSheet'
import { mostraMenuAzioniAlert } from '../../utils/mostraMenuAzioniAlert'
import { MODIFICA_VERSIONE_ALTERNATIVA_LABEL } from '../../features/modificaPreventivo/constants'
import type { PreventivoInvio } from '../../api/firma'
import { PreventivoCardAzioni } from '../preventivo/PreventivoCardAzioni'
import { preventivoCardRowStyles } from '../preventivo/preventivoCardStyles'
import { RipristinaVersioneLink } from '../preventivo/RipristinaVersioneLink'
import { FirmaStatoBadge, mostraPulsanteInviaFirma } from '../firma/FirmaStatoBadge'
import { statoFirmaInvio } from '../../api/firma'
import { Preventivo } from '../../types'
import { formatImportoDb } from 'preventivoai-shared'
import { useStoricoTheme } from '../../hooks/useStoricoTheme'
import { IconLabel } from '../icons/IconLabel'
import { AppIcon } from '../icons/AppIcon'
import { storicoStyles as styles } from './storicoStyles'

type Props = {
  preventivi: Preventivo[]
  collegamentiPiano?: Record<string, 'canone' | 'rate'>
  selezioneAttiva: boolean
  preventiviSelezionati: string[]
  aperto: string | null
  cronologiaAperta: string | null
  cronologiaVersioneAperta: string | null
  cronologia: { [key: string]: Preventivo[] }
  onCardPress: (preventivo: Preventivo) => void
  onLongPress: (preventivoId: string) => void
  onToggleSelezione: (preventivoId: string) => void
  onStatoPress: (preventivoId: string) => void
  onScaricaPdf: (preventivo: Preventivo) => void
  onElimina: (preventivoId: string) => void
  onRinomina: (preventivo: Preventivo) => void
  onSposta: (preventivoId: string) => void
  onCaricaCronologia: (preventivoId: string, padreId: string | null) => void
  onToggleVersione: (versioneId: string) => void
  onRipristinaVersione: (preventivoCorrenteId: string, versione: Preventivo) => void
  onModificaVersione: (preventivo: Preventivo) => void
  inviiFirma?: Record<string, PreventivoInvio>
  onInviaFirma?: (preventivo: Preventivo) => void
  onApriFirmaDettaglio?: (preventivo: Preventivo) => void
}

export function StoricoPreventiviList({
  preventivi,
  collegamentiPiano = {},
  selezioneAttiva,
  preventiviSelezionati,
  aperto,
  cronologiaAperta,
  cronologiaVersioneAperta,
  cronologia,
  onCardPress,
  onLongPress,
  onToggleSelezione,
  onStatoPress,
  onScaricaPdf,
  onElimina,
  onRinomina,
  onSposta,
  onCaricaCronologia,
  onToggleVersione,
  onRipristinaVersione,
  onModificaVersione,
  inviiFirma = {},
  onInviaFirma,
  onApriFirmaDettaglio,
}: Props) {
  const th = useStoricoTheme()

  function vociMenu(p: Preventivo): VoceMenuAzione[] {
    return [
      { label: 'Rinomina', onPress: () => onRinomina(p) },
      { label: 'Sposta', onPress: () => onSposta(p.id) },
      { label: 'Elimina', onPress: () => onElimina(p.id), danger: true },
    ]
  }

  function apriMenuPreventivo(p: Preventivo) {
    const titolo = p.titolo || p.nome_cliente || 'Preventivo'
    mostraMenuAzioniAlert(vociMenu(p), titolo)
  }

  return (
    <>
      {preventivi.map(p => {
        const selezionato = preventiviSelezionati.includes(p.id)
        const invio = inviiFirma[p.id]
        const sfFirma = statoFirmaInvio(invio)
        const mostraInvia = mostraPulsanteInviaFirma(p.pdf_url, invio)
        const dataFormattata = new Date(p.created_at).toLocaleDateString('it-IT', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })

        return (
          <View key={p.id} style={[styles.card, th.card, selezionato && th.cardSelected]}>
            <LongPressAwarePressable
              style={preventivoCardRowStyles.row}
              onPress={() => onCardPress(p)}
              onLongPress={() => onLongPress(p.id)}
            >
              <View style={preventivoCardRowStyles.left}>
                <Text style={[styles.cardCliente, th.text]}>{p.nome_cliente || 'Senza cliente'}</Text>
                {p.titolo ? <Text style={[styles.cardTitolo, th.textMuted]}>{p.titolo}</Text> : null}
                <Text style={[styles.cardData, th.textMuted]}>{dataFormattata}</Text>
                {collegamentiPiano[p.id] ? (
                  <View style={styles.cardPianoBadge}>
                    <IconLabel
                      icon={collegamentiPiano[p.id] === 'rate' ? 'calendar' : 'repeat'}
                      label={collegamentiPiano[p.id] === 'rate' ? 'Piano a rate collegato' : 'Abbonamento collegato'}
                      color="#0E9F8E"
                      textStyle={styles.cardPianoBadgeText}
                    />
                  </View>
                ) : null}
                <FirmaStatoBadge
                  invio={invio}
                  onPress={
                    selezioneAttiva
                      ? () => onToggleSelezione(p.id)
                      : sfFirma !== 'nessuno' && onApriFirmaDettaglio
                        ? () => onApriFirmaDettaglio(p)
                        : undefined
                  }
                  onLongPress={!selezioneAttiva ? () => onLongPress(p.id) : undefined}
                />
              </View>

              <PreventivoCardAzioni
                preventivo={p}
                collegamentoPiano={!!collegamentiPiano[p.id]}
                mostraInvia={mostraInvia}
                modalitaSelezione={selezioneAttiva}
                selezionato={selezionato}
                onStatoPress={() => onStatoPress(p.id)}
                onToggleSelezione={() => onToggleSelezione(p.id)}
                onLongPress={() => onLongPress(p.id)}
                onScaricaPdf={() => onScaricaPdf(p)}
                onInviaFirma={onInviaFirma ? () => onInviaFirma(p) : undefined}
                onMenu={() => apriMenuPreventivo(p)}
              />
            </LongPressAwarePressable>

            {aperto === p.id && (
              <View style={[styles.detail, th.detailBorder]}>
                {p.testo_preventivo ? <Text style={[styles.detailText, th.detailText]}>{p.testo_preventivo}</Text> : null}

                {p.versione && p.versione > 1 ? (
                  <TouchableOpacity style={styles.cronologiaBtn} onPress={() => onCaricaCronologia(p.id, p.preventivo_padre_id)}>
                    <Text style={styles.cronologiaBtnText}>
                      {cronologiaAperta === p.id ? '\u25B2 Nascondi cronologia' : `\u25BC Mostra cronologia (${p.versione - 1} vers. precedenti)`}
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {cronologiaAperta === p.id && cronologia[p.id]?.map(v => (
                  <TouchableOpacity key={v.id} style={[styles.cronologiaItem, th.cronologiaItem]} onPress={() => onToggleVersione(v.id)}>
                    <Text style={styles.cronologiaVer}>{`v${v.versione || 1}`}</Text>
                    <Text style={styles.cronologiaData}>{new Date(v.created_at).toLocaleDateString('it-IT')}</Text>
                    <Text style={styles.cronologiaImporto}>{v.importo_totale ? `\u20AC${formatImportoDb(v.importo_totale)}` : '\u2014'}</Text>
                  </TouchableOpacity>
                ))}

                {cronologiaAperta === p.id && cronologia[p.id]?.map(v =>
                  cronologiaVersioneAperta === v.id ? (
                    <View key={`detail-${v.id}`} style={styles.cronologiaDetail}>
                      <Text style={styles.prevTesto}>{v.testo_preventivo}</Text>
                      <RipristinaVersioneLink
                        versione={v}
                        onRipristina={() => onRipristinaVersione(p.id, v)}
                      />
                    </View>
                  ) : null
                )}

                <TouchableOpacity style={styles.editBtn} onPress={() => onModificaVersione(p)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                    <AppIcon name="edit-2" size={16} color="#0E9F8E" />
                    <Text style={styles.editBtnText}>{MODIFICA_VERSIONE_ALTERNATIVA_LABEL}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )
      })}
    </>
  )
}
