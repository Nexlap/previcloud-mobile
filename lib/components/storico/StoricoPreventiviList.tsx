import { Alert, Text, TouchableOpacity, View } from 'react-native'
import { Preventivo } from '../../types'
import { storicoStyles as styles } from './storicoStyles'

type Props = {
  preventivi: Preventivo[]
  selezioneAttiva: boolean
  preventiviSelezionati: string[]
  aperto: string | null
  cronologiaAperta: string | null
  cronologia: { [key: string]: Preventivo[] }
  onCardPress: (preventivo: Preventivo) => void
  onLongPress: (preventivoId: string) => void
  onToggleSelezione: (preventivoId: string) => void
  onStatoPress: (preventivoId: string) => void
  onScaricaPdf: (preventivo: Preventivo) => void
  onElimina: (preventivoId: string) => void
  onCaricaCronologia: (preventivoId: string, padreId: string | null) => void
  onToggleVersioneAperta: (preventivoId: string, versioneId: string) => void
  onRipristinaVersione: (preventivoCorrenteId: string, versione: Preventivo) => void
  onRiprendiBozza: (preventivoId: string) => void
  onModificaVersione: (preventivo: Preventivo) => void
}

function statoColore(stato: string | null | undefined) {
  if (stato === 'accettato') return { color: '#0E9F8E' }
  if (stato === 'rifiutato') return { color: '#EF4444' }
  if (stato === 'inviato') return { color: '#1D4ED8' }
  return {}
}

export function StoricoPreventiviList({
  preventivi,
  selezioneAttiva,
  preventiviSelezionati,
  aperto,
  cronologiaAperta,
  cronologia,
  onCardPress,
  onLongPress,
  onToggleSelezione,
  onStatoPress,
  onScaricaPdf,
  onElimina,
  onCaricaCronologia,
  onToggleVersioneAperta,
  onRipristinaVersione,
  onRiprendiBozza,
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
                  style={{ alignItems: 'flex-end' }}
                  onPress={() => selezioneAttiva ? onToggleSelezione(p.id) : onStatoPress(p.id)}
                >
                  <Text style={styles.cardImporto}>{p.importo_totale ? `\u20AC${p.importo_totale}` : '\u2014'}</Text>
                  <Text style={[styles.cardStato, statoColore(p.stato)]}>{`${p.stato || 'bozza'} \u25BC`}</Text>
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
                  <TouchableOpacity key={v.id} style={styles.cronologiaItem} onPress={() => onToggleVersioneAperta(p.id, v.id)}>
                    <Text style={styles.cronologiaVer}>{`v${v.versione || 1}`}</Text>
                    <Text style={styles.cronologiaData}>{new Date(v.created_at).toLocaleDateString('it-IT')}</Text>
                    <Text style={styles.cronologiaImporto}>{v.importo_totale ? `\u20AC${v.importo_totale}` : '\u2014'}</Text>
                  </TouchableOpacity>
                ))}

                {cronologiaAperta === p.id && cronologia[p.id]?.map(v =>
                  aperto === v.id ? (
                    <View key={`detail-${v.id}`} style={styles.cronologiaDetail}>
                      <Text style={styles.prevTesto}>{v.testo_preventivo}</Text>
                      <TouchableOpacity
                        style={styles.ripristinaBtn}
                        onPress={() => Alert.alert('Ripristina versione', `Vuoi ripristinare la v${v.versione || 1}?`, [
                          { text: 'Annulla', style: 'cancel' },
                          { text: 'Ripristina', onPress: () => onRipristinaVersione(p.id, v) },
                        ])}
                      >
                        <Text style={styles.ripristinaBtnText}>{'\u21A9'} Ripristina questa versione</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null
                )}

                {p.stato === 'bozza' ? (
                  <TouchableOpacity style={styles.riprendiBtn} onPress={() => onRiprendiBozza(p.id)}>
                    <Text style={styles.riprendiBtnText}>{'\uD83D\uDCAC'} Riprendi bozza</Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity style={styles.editBtn} onPress={() => onModificaVersione(p)}>
                  <Text style={styles.editBtnText}>{`\u270F\uFE0F Modifica e genera v${(p.versione || 1) + 1}`}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )
      })}
    </>
  )
}
