import { Text, TouchableOpacity, View } from 'react-native'
import { MODIFICA_VERSIONE_ALTERNATIVA_LABEL } from '../../features/modificaPreventivo/constants'
import { PreventivoStatoBadge } from '../preventivo/PreventivoStatoBadge'
import { RipristinaVersioneLink } from '../preventivo/RipristinaVersioneLink'
import { Preventivo } from '../../types'
import { formatImportoDb } from '../../utils/importo'
import { storicoStyles as styles } from './storicoStyles'

type Props = {
  preventivi: Preventivo[]
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
  onCaricaCronologia: (preventivoId: string, padreId: string | null) => void
  onToggleVersione: (versioneId: string) => void
  onRipristinaVersione: (preventivoCorrenteId: string, versione: Preventivo) => void
  onModificaVersione: (preventivo: Preventivo) => void
}

export function StoricoPreventiviList({
  preventivi,
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
  onCaricaCronologia,
  onToggleVersione,
  onRipristinaVersione,
  onModificaVersione,
}: Props) {
  return (
    <>
      {preventivi.map(p => {
        const selezionato = preventiviSelezionati.includes(p.id)
        return (
          <View key={p.id} style={[styles.card, selezionato && styles.cardSelected]}>
            <View style={styles.cardRowContainer}>
              <TouchableOpacity
                style={[styles.cardRow, { flex: 1 }]}
                onLongPress={() => onLongPress(p.id)}
                onPress={() => onCardPress(p)}
              >
                <View style={styles.cardIcon}>
                  <Text style={styles.cardIconText}>{'\uD83D\uDCC4'}</Text>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardCliente}>{p.nome_cliente || 'Senza cliente'}</Text>
                  {p.titolo ? <Text style={styles.cardTitolo}>{p.titolo}</Text> : null}
                  <Text style={styles.cardData}>
                    {new Date(p.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 12 }}>
                <TouchableOpacity
                  style={{ alignItems: 'flex-end', gap: 4 }}
                  onPress={() => selezioneAttiva ? onToggleSelezione(p.id) : onStatoPress(p.id)}
                >
                  <Text style={styles.cardImporto}>{p.importo_totale ? `\u20AC${formatImportoDb(p.importo_totale)}` : '\u2014'}</Text>
                  <PreventivoStatoBadge stato={p.stato} pagato={p.pagato} showArrow />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => selezioneAttiva ? onToggleSelezione(p.id) : onScaricaPdf(p)}>
                  <Text style={{ fontSize: 16 }}>{p.pdf_url ? '\uD83D\uDCC4' : '\uD83D\uDD04'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => selezioneAttiva ? onToggleSelezione(p.id) : onElimina(p.id)}>
                  <Text style={{ fontSize: 16 }}>{'\uD83D\uDDD1'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {aperto === p.id && (
              <View style={styles.detail}>
                {p.testo_preventivo ? <Text style={styles.detailText}>{p.testo_preventivo}</Text> : null}

                {p.versione && p.versione > 1 ? (
                  <TouchableOpacity style={styles.cronologiaBtn} onPress={() => onCaricaCronologia(p.id, p.preventivo_padre_id)}>
                    <Text style={styles.cronologiaBtnText}>
                      {cronologiaAperta === p.id ? '\u25B2 Nascondi cronologia' : `\u25BC Mostra cronologia (${p.versione - 1} vers. precedenti)`}
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {cronologiaAperta === p.id && cronologia[p.id]?.map(v => (
                  <TouchableOpacity key={v.id} style={styles.cronologiaItem} onPress={() => onToggleVersione(v.id)}>
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
                  <Text style={styles.editBtnText}>{`\u270F\uFE0F ${MODIFICA_VERSIONE_ALTERNATIVA_LABEL}`}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )
      })}
    </>
  )
}
