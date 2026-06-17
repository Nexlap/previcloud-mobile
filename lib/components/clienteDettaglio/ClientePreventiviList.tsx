import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MODIFICA_VERSIONE_ALTERNATIVA_LABEL } from '../../features/modificaPreventivo/constants'
import { PreventivoStatoBadge } from '../preventivo/PreventivoStatoBadge'
import { RipristinaVersioneLink } from '../preventivo/RipristinaVersioneLink'
import { Preventivo } from '../../types'

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
}: Props) {
  if (preventivi.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Nessun preventivo per questo cliente</Text>
      </View>
    )
  }

  return (
    <>
      {preventivi.map(p => (
        <TouchableOpacity
          key={p.id}
          style={[styles.prevCard, !p.is_ultimo && styles.prevCardOld, selezione.includes(p.id) && styles.prevCardSelected]}
          onPress={() => onToggleCard(p.id)}
          onLongPress={() => onLongPress(p.id)}
        >
          <View style={styles.prevRow}>
            {modalitaSelezione && (
              <View style={[styles.checkCircle, selezione.includes(p.id) && styles.checkCircleActive]}>
                {selezione.includes(p.id) && <Text style={styles.checkMark}>{'\u2713'}</Text>}
              </View>
            )}
            <View style={styles.prevLeft}>
              <Text style={styles.prevVersione}>{p.titolo || 'Preventivo'}</Text>
              <Text style={styles.prevData}>
                {`${new Date(p.created_at).toLocaleDateString('it-IT')}${p.is_ultimo ? ' · attivo' : ''}`}
              </Text>
              {collegamentiPiano[p.id] ? (
                <Text style={styles.prevPianoBadge}>
                  {collegamentiPiano[p.id] === 'rate' ? '\uD83D\uDCC5 Piano a rate collegato' : '\uD83D\uDCB0 Abbonamento collegato'}
                </Text>
              ) : null}
            </View>
            <View style={[styles.prevRightRow, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
              <TouchableOpacity style={styles.prevRight} onPress={() => onStatoPress(p.id)}>
                <Text style={styles.prevImporto}>{p.importo_totale ? `\u20AC${p.importo_totale}` : '—'}</Text>
                <PreventivoStatoBadge stato={p.stato} showArrow />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onScaricaPdf(p)}>
                <Text style={{ fontSize: 16 }}>{p.pdf_url ? '\uD83D\uDCC4' : '\uD83D\uDD04'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onElimina(p.id)}>
                <Text style={{ fontSize: 16 }}>{'\uD83D\uDDD1'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {aperto === p.id && p.testo_preventivo && (
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
                    <Text style={styles.cronologiaImporto}>{v.importo_totale ? `\u20AC${v.importo_totale}` : '—'}</Text>
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
              {p.is_ultimo && (
                <TouchableOpacity style={styles.editBtn} onPress={() => onModificaUltimo(p)}>
                  <Text style={styles.editBtnText}>{`\u270F\uFE0F ${MODIFICA_VERSIONE_ALTERNATIVA_LABEL}`}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.spostaBtn} onPress={() => onSposta(p.id)}>
                <Text style={styles.postaBtnText}>{'\u2197'} Sposta ad altro cliente</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.spostaBtn} onPress={() => onRinomina(p)}>
                <Text style={styles.postaBtnText}>{'\u270F\uFE0F'} Rinomina preventivo</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </>
  )
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 14, color: '#9CA3AF', marginBottom: 12 },
  prevCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  prevCardOld: { opacity: 0.6 },
  prevCardSelected: { borderColor: '#0E9F8E', borderWidth: 2 },
  prevRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  prevLeft: { flex: 1 },
  prevVersione: { fontSize: 13, fontWeight: '700', color: '#0D1B2A' },
  prevData: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  prevPianoBadge: { fontSize: 11, color: '#0E9F8E', fontWeight: '600', marginTop: 4 },
  prevRightRow: { alignItems: 'flex-end', gap: 6 },
  prevRight: { alignItems: 'flex-end', gap: 4 },
  prevImporto: { fontSize: 14, fontWeight: '600', color: '#0D1B2A' },
  prevDetail: { padding: 14, borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 10 },
  prevTesto: { fontSize: 12, color: '#6B7280', lineHeight: 18, fontFamily: 'monospace' },
  editBtn: { backgroundColor: '#0D1B2A', borderRadius: 10, padding: 10, alignItems: 'center' },
  editBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  spostaBtn: { borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  postaBtnText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
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
