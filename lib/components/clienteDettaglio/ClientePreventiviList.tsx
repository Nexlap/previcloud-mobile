import { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { LongPressAwarePressable } from '../LongPressAwarePressable'
import { MenuAzioniSheet, type VoceMenuAzione } from '../MenuAzioniSheet'
import { MODIFICA_VERSIONE_ALTERNATIVA_LABEL } from '../../features/modificaPreventivo/constants'
import type { PreventivoInvio } from '../../api/firma'
import { PreventivoCardAzioni } from '../preventivo/PreventivoCardAzioni'
import { RipristinaVersioneLink } from '../preventivo/RipristinaVersioneLink'
import { FirmaStatoBadge, mostraPulsanteInviaFirma } from '../firma/FirmaStatoBadge'
import { statoFirmaInvio } from '../../api/firma'
import { Preventivo } from '../../types'
import { formatImportoDb } from '../../utils/importo'
import { IconLabel } from '../icons/IconLabel'
import { AppIcon } from '../icons/AppIcon'

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
}: Props) {
  const [menuPreventivo, setMenuPreventivo] = useState<Preventivo | null>(null)

  function vociMenu(p: Preventivo): VoceMenuAzione[] {
    return [
      { label: 'Rinomina', onPress: () => onRinomina(p) },
      { label: 'Sposta', onPress: () => onSposta(p.id) },
      { label: 'Elimina', onPress: () => onElimina(p.id), danger: true },
    ]
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
        <LongPressAwarePressable
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
              onMenu={() => setMenuPreventivo(p)}
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
              {p.is_ultimo && (
                <TouchableOpacity style={styles.editBtn} onPress={() => onModificaUltimo(p)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                    <AppIcon name="edit-2" size={16} color="#0E9F8E" />
                    <Text style={styles.editBtnText}>{MODIFICA_VERSIONE_ALTERNATIVA_LABEL}</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          )}
        </LongPressAwarePressable>
        )
      })}

      <MenuAzioniSheet
        visible={menuPreventivo !== null}
        voci={menuPreventivo ? vociMenu(menuPreventivo) : []}
        onClose={() => setMenuPreventivo(null)}
      />
    </>
  )
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 14, color: '#9CA3AF', marginBottom: 12 },
  prevCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  prevCardOld: { opacity: 0.6 },
  prevCardSelected: { borderColor: '#0E9F8E', borderWidth: 2 },
  prevRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 14 },
  prevLeft: { flex: 1, minWidth: 0, paddingRight: 8 },
  prevVersione: { fontSize: 13, fontWeight: '700', color: '#0D1B2A' },
  prevData: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  prevPianoBadge: { marginTop: 4 },
  prevDetail: { padding: 14, borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 10 },
  prevTesto: { fontSize: 12, color: '#6B7280', lineHeight: 18, fontFamily: 'monospace' },
  editBtn: { backgroundColor: '#0D1B2A', borderRadius: 10, padding: 10, alignItems: 'center' },
  editBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
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
