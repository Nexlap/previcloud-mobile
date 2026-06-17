import { useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TouchableOpacity, View, type DimensionValue } from 'react-native'
import { MESI_BREVI } from '../../constants'
import { Abbonamento, PreventivoMadre, RataAbbonamento } from '../../types'
import { formatImportoEuro } from '../../utils/importo'
import { titoloHeaderPiano } from '../../utils/preventivoMadre'
import { PreventivoMadreLink } from './PreventivoMadreLink'
import { StoricoPianiCollegati } from './StoricoPianiCollegati'

type Props = {
  loading: boolean
  abbonamento: Abbonamento | null
  preventivoMadre: PreventivoMadre | null
  abbonamentiStorico: Abbonamento[]
  preventiviMadreStorico: Record<string, PreventivoMadre>
  onApriPreventivoMadre?: (preventivoId: string) => void
  totaleIncassato: number
  meseCorrente: number
  annoCorrente: number
  rataMeseCorrente: RataAbbonamento | undefined
  rateStoriche: RataAbbonamento[]
  abEspanso: boolean
  rataMiniAperta: string | null
  invioReminderLoading: string | null
  selezioneAttiva: boolean
  rateSelezionate: string[]
  onAvviaSelezione: (rataId: string) => void
  onToggleSelezione: (rataId: string) => void
  onCreate: () => void
  onToggleEspanso: () => void
  onRename: () => void
  onOpenAddRata: () => void
  onOpenPagamento: (rata: RataAbbonamento) => void
  onSendReminder: (rata: RataAbbonamento) => void
  onAzzeraPagamento: (rataId: string) => void
  onToggleRataMini: (rataId: string) => void
  onEditCanone: () => void
  onDeleteAbbonamento: () => void
}

function labelScadenza(rata: RataAbbonamento) {
  return `${MESI_BREVI[rata.mese - 1]} ${rata.anno}`
}

function badgeCanone(stato: RataAbbonamento['stato']) {
  if (stato === 'incassato') return { label: 'Incassato', bg: '#D1FAE5', color: '#0E9F8E' }
  if (stato === 'in_ritardo') return { label: 'In ritardo', bg: '#FEE2E2', color: '#EF4444' }
  if (stato === 'parziale') return { label: 'Parziale', bg: '#FEF3C7', color: '#D97706' }
  return { label: 'Da incassare', bg: '#F3F4F6', color: '#6B7280' }
}

function ordinaRateRecenti(a: RataAbbonamento, b: RataAbbonamento) {
  return b.anno - a.anno || b.mese - a.mese
}

function percentWidth(value: number): DimensionValue {
  return `${Math.max(0, Math.min(100, value))}%`
}

function residuoRata(rata: RataAbbonamento) {
  return rata.importo - (rata.acconto || 0)
}

type RataDetailProps = {
  rata: RataAbbonamento
  invioReminderLoading: string | null
  onOpenPagamento: (rata: RataAbbonamento) => void
  onSendReminder: (rata: RataAbbonamento) => void
  onAzzeraPagamento: (rataId: string) => void
}

function RataDetail({
  rata,
  invioReminderLoading,
  onOpenPagamento,
  onSendReminder,
  onAzzeraPagamento,
}: RataDetailProps) {
  return (
    <>
      {rata.stato === 'parziale' && (
        <View style={styles.rataBarraContainer}>
          <View style={styles.rataBarra}>
            <View style={[styles.rataBarraFill, { width: percentWidth(((rata.acconto || 0) / rata.importo) * 100) }]} />
          </View>
          <View style={styles.rataBarraLabels}>
            <Text style={styles.rataBarraAcconto}>Acconto: {'\u20AC'}{rata.acconto}</Text>
            <Text style={styles.rataBarraResiduo}>Residuo: {'\u20AC'}{residuoRata(rata)}</Text>
          </View>
        </View>
      )}
      {rata.note ? <Text style={styles.rataNota}>{rata.note}</Text> : null}
      <View style={styles.rataAzioni}>
        {rata.stato !== 'incassato' && (
          <TouchableOpacity style={styles.rataAzioneBtn} onPress={() => onOpenPagamento(rata)}>
            <Text style={styles.rataAzioneBtnText}>+ Registra pagamento</Text>
          </TouchableOpacity>
        )}
        {rata.stato !== 'incassato' && (
          <TouchableOpacity
            style={[styles.rataAzioneBtn, styles.reminderBtnCompact]}
            onPress={() => onSendReminder(rata)}
            disabled={invioReminderLoading === rata.id}
          >
            {invioReminderLoading === rata.id
              ? <ActivityIndicator size="small" color="#25D366" />
              : <Text style={styles.reminderBtnCompactText}>{'\uD83D\uDCE4'} WA</Text>}
          </TouchableOpacity>
        )}
        {rata.stato === 'incassato' && (
          <TouchableOpacity
            style={[styles.rataAzioneBtn, { borderColor: '#E5E7EB' }]}
            onPress={() => Alert.alert('Azzera', 'Riportare a "da incassare"?', [
              { text: 'Annulla', style: 'cancel' },
              { text: 'Azzera', style: 'destructive', onPress: () => onAzzeraPagamento(rata.id) },
            ])}
          >
            <Text style={[styles.rataAzioneBtnText, { color: '#9CA3AF' }]}>{'\u21A9'} Azzera</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  )
}

type RataStoricoProps = {
  rata: RataAbbonamento
  aperta: boolean
  selezioneAttiva: boolean
  selezionata: boolean
  invioReminderLoading: string | null
  onPress: () => void
  onLongPress: () => void
  onOpenPagamento: (rata: RataAbbonamento) => void
  onSendReminder: (rata: RataAbbonamento) => void
  onAzzeraPagamento: (rataId: string) => void
}

function RataStoricoRow({
  rata,
  aperta,
  selezioneAttiva,
  selezionata,
  invioReminderLoading,
  onPress,
  onLongPress,
  onOpenPagamento,
  onSendReminder,
  onAzzeraPagamento,
}: RataStoricoProps) {
  const badge = badgeCanone(rata.stato)
  return (
    <Pressable
      style={[styles.rataMiniTab, selezioneAttiva && selezionata && styles.rataMiniTabSelected]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
    >
      <View style={styles.rataMiniRow}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.rataMiniMese}>{labelScadenza(rata)}</Text>
          {selezioneAttiva && selezionata ? <Text style={styles.rataCheck}>{'\u2713'}</Text> : null}
        </View>
        <Text style={styles.rataMiniImporto}>{`\u20AC${formatImportoEuro(rata.importo, 2)}`}</Text>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
        </View>
        {!selezioneAttiva ? (
          <Text style={styles.sectionArrow}>{aperta ? '\u25B2' : '\u25BC'}</Text>
        ) : null}
      </View>
      {!selezioneAttiva && aperta ? (
        <View style={styles.rataMiniDetail}>
          <RataDetail
            rata={rata}
            invioReminderLoading={invioReminderLoading}
            onOpenPagamento={onOpenPagamento}
            onSendReminder={onSendReminder}
            onAzzeraPagamento={onAzzeraPagamento}
          />
        </View>
      ) : null}
    </Pressable>
  )
}

export function ClienteAbbonamentoTab({
  loading,
  abbonamento,
  preventivoMadre,
  abbonamentiStorico,
  preventiviMadreStorico,
  onApriPreventivoMadre,
  totaleIncassato,
  meseCorrente,
  annoCorrente,
  rataMeseCorrente,
  rateStoriche,
  abEspanso,
  rataMiniAperta,
  invioReminderLoading,
  selezioneAttiva,
  rateSelezionate,
  onAvviaSelezione,
  onToggleSelezione,
  onCreate,
  onToggleEspanso,
  onRename,
  onOpenAddRata,
  onOpenPagamento,
  onSendReminder,
  onAzzeraPagamento,
  onToggleRataMini,
  onEditCanone,
  onDeleteAbbonamento,
}: Props) {
  const [storicoAperto, setStoricoAperto] = useState(false)

  const rateStoricheOrdinate = useMemo(
    () => [...rateStoriche].sort(ordinaRateRecenti),
    [rateStoriche],
  )

  if (loading) return <ActivityIndicator color="#0E9F8E" style={{ marginTop: 40 }} />

  if (!abbonamento) {
    return (
      <View style={styles.abEmpty}>
        <Text style={styles.abEmptyIcon}>{'\uD83D\uDCB0'}</Text>
        <Text style={styles.abEmptyTitle}>Nessun abbonamento</Text>
        <Text style={styles.abEmptyText}>Configura un canone mensile ricorrente per questo cliente</Text>
        <TouchableOpacity style={styles.abCreaBtn} onPress={onCreate}>
          <Text style={styles.abCreaBtnText}>+ Configura abbonamento</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const badgeCorrente = rataMeseCorrente ? badgeCanone(rataMeseCorrente.stato) : null

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.abHeader} onPress={onToggleEspanso} activeOpacity={0.8}>
        <View style={styles.abHeaderTesto}>
          <Text style={styles.abHeaderNome} numberOfLines={1} ellipsizeMode="tail">
            {titoloHeaderPiano(abbonamento.nome, preventivoMadre, 'canone', 'Abbonamento N.1')}
          </Text>
          <Text style={styles.abHeaderSub}>
            {`Canone mensile \u00B7 \u20AC${formatImportoEuro(abbonamento.importo_default, 2)}/mese \u00B7 giorno ${abbonamento.giorno_scadenza}`}
          </Text>
          {totaleIncassato > 0 ? (
            <Text style={styles.abHeaderHint}>
              {`\u20AC${formatImportoEuro(totaleIncassato, 2)} incassati`}
            </Text>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <TouchableOpacity onPress={onRename}>
            <Text style={{ fontSize: 16 }}>{'\u270F\uFE0F'}</Text>
          </TouchableOpacity>
          <Text style={styles.abHeaderArrow}>{abEspanso ? '\u25B2' : '\u25BC'}</Text>
        </View>
      </TouchableOpacity>

      {abEspanso ? (
        <View style={styles.abBody}>
          <PreventivoMadreLink preventivo={preventivoMadre} onPress={onApriPreventivoMadre} />

          {rataMeseCorrente ? (
            <Pressable
              style={[
                styles.rataCardCorrente,
                selezioneAttiva && rateSelezionate.includes(rataMeseCorrente.id) && styles.rataCardSelected,
              ]}
              onPress={() => selezioneAttiva ? onToggleSelezione(rataMeseCorrente.id) : undefined}
              onLongPress={() => onAvviaSelezione(rataMeseCorrente.id)}
              delayLongPress={400}
            >
              <View style={styles.rataRow}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text style={styles.rataMese}>
                      {`${MESI_BREVI[rataMeseCorrente.mese - 1]} ${rataMeseCorrente.anno}`}
                    </Text>
                    <Text style={styles.rataMeseTag}>corrente</Text>
                    {selezioneAttiva && rateSelezionate.includes(rataMeseCorrente.id) ? (
                      <Text style={styles.rataCheck}>{'\u2713'}</Text>
                    ) : null}
                  </View>
                  {rataMeseCorrente.note ? <Text style={styles.rataNota}>{rataMeseCorrente.note}</Text> : null}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <Text style={styles.rataImporto}>
                    {`\u20AC${formatImportoEuro(rataMeseCorrente.importo, 2)}`}
                  </Text>
                  {badgeCorrente ? (
                    <View style={[styles.badge, { backgroundColor: badgeCorrente.bg }]}>
                      <Text style={[styles.badgeText, { color: badgeCorrente.color }]}>{badgeCorrente.label}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              {!selezioneAttiva ? (
                <RataDetail
                  rata={rataMeseCorrente}
                  invioReminderLoading={invioReminderLoading}
                  onOpenPagamento={onOpenPagamento}
                  onSendReminder={onSendReminder}
                  onAzzeraPagamento={onAzzeraPagamento}
                />
              ) : null}
            </Pressable>
          ) : (
            <TouchableOpacity style={styles.abGeneraBtn} onPress={onOpenAddRata}>
              <Text style={styles.abGeneraBtnText}>
                {`+ Aggiungi canone ${MESI_BREVI[meseCorrente - 1]} ${annoCorrente}`}
              </Text>
            </TouchableOpacity>
          )}

          {rateStoricheOrdinate.length > 0 ? (
            <View style={styles.section}>
              <TouchableOpacity style={styles.sectionHeader} onPress={() => setStoricoAperto(v => !v)}>
                <Text style={styles.sectionTitle}>{`Storico canoni (${rateStoricheOrdinate.length})`}</Text>
                <Text style={styles.sectionArrow}>{storicoAperto ? '\u25B2' : '\u25BC'}</Text>
              </TouchableOpacity>
              {storicoAperto ? rateStoricheOrdinate.map(rata => (
                <RataStoricoRow
                  key={rata.id}
                  rata={rata}
                  aperta={rataMiniAperta === rata.id}
                  selezioneAttiva={selezioneAttiva}
                  selezionata={rateSelezionate.includes(rata.id)}
                  invioReminderLoading={invioReminderLoading}
                  onPress={() => selezioneAttiva ? onToggleSelezione(rata.id) : onToggleRataMini(rata.id)}
                  onLongPress={() => onAvviaSelezione(rata.id)}
                  onOpenPagamento={onOpenPagamento}
                  onSendReminder={onSendReminder}
                  onAzzeraPagamento={onAzzeraPagamento}
                />
              )) : null}
            </View>
          ) : null}

          {!selezioneAttiva ? (
            <>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={styles.abAzioneBtn} onPress={onEditCanone}>
                  <Text style={styles.abAzioneBtnText}>{'\u270F\uFE0F'} Modifica canone</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.abAzioneBtn, { borderColor: '#FCA5A5' }]} onPress={() => {
                  Alert.alert('Elimina abbonamento', 'Le rate storiche resteranno salvate. Vuoi procedere?', [
                    { text: 'Annulla', style: 'cancel' },
                    { text: 'Elimina', style: 'destructive', onPress: onDeleteAbbonamento },
                  ])
                }}>
                  <Text style={[styles.abAzioneBtnText, { color: '#EF4444' }]}>{'\uD83D\uDDD1'} Elimina</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.abAggiungiBtn} onPress={onOpenAddRata}>
                <Text style={styles.abAggiungiText}>+ Aggiungi canone (mese/anno)</Text>
              </TouchableOpacity>
            </>
          ) : null}
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

const styles = StyleSheet.create({
  container: { gap: 12 },
  abEmpty: { alignItems: 'center', paddingTop: 40, gap: 10 },
  abEmptyIcon: { fontSize: 40 },
  abEmptyTitle: { fontSize: 16, fontWeight: '700', color: '#0D1B2A' },
  abEmptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 20 },
  abCreaBtn: { backgroundColor: '#0D1B2A', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  abCreaBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  abHeader: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center' },
  abHeaderTesto: { flex: 1, minWidth: 0 },
  abHeaderNome: { fontSize: 15, fontWeight: '700', color: '#0D1B2A' },
  abHeaderSub: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  abHeaderHint: { fontSize: 12, color: '#0E9F8E', marginTop: 4, fontWeight: '500' },
  abHeaderArrow: { fontSize: 12, color: '#9CA3AF' },
  abBody: { gap: 10 },
  rataCardCorrente: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: '#0E9F8E', padding: 14, gap: 10 },
  rataCardSelected: { backgroundColor: '#F0FDF4' },
  rataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  rataMese: { fontSize: 14, fontWeight: '600', color: '#0D1B2A' },
  rataMeseTag: { fontSize: 10, fontWeight: '600', color: '#0E9F8E', backgroundColor: '#F0FDF4', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  rataImporto: { fontSize: 15, fontWeight: '700', color: '#0D1B2A' },
  abGeneraBtn: { backgroundColor: '#F7F8FA', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  abGeneraBtnText: { fontSize: 13, color: '#0E9F8E', fontWeight: '500' },
  section: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#F7F8FA' },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: '#6B7280', letterSpacing: 0.6, textTransform: 'uppercase' },
  sectionArrow: { fontSize: 10, color: '#9CA3AF' },
  rataMiniTab: { borderTopWidth: 1, borderTopColor: '#F3F4F6', padding: 12 },
  rataMiniTabSelected: { backgroundColor: '#F0FDF4' },
  rataMiniRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rataMiniMese: { fontSize: 13, fontWeight: '500', color: '#0D1B2A' },
  rataMiniImporto: { fontSize: 13, fontWeight: '600', color: '#0D1B2A' },
  rataMiniDetail: { marginTop: 10, gap: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '600' },
  rataCheck: { fontSize: 14, fontWeight: '700', color: '#0E9F8E' },
  abAggiungiBtn: { alignItems: 'center', padding: 12 },
  abAggiungiText: { fontSize: 13, color: '#0E9F8E', fontWeight: '500' },
  abAzioneBtn: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  abAzioneBtnText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  rataNota: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  rataBarraContainer: { gap: 4 },
  rataBarra: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
  rataBarraFill: { height: 6, backgroundColor: '#F59E0B', borderRadius: 3 },
  rataBarraLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  rataBarraAcconto: { fontSize: 11, color: '#F59E0B', fontWeight: '500' },
  rataBarraResiduo: { fontSize: 11, color: '#EF4444', fontWeight: '500' },
  rataAzioni: { flexDirection: 'row', gap: 8 },
  rataAzioneBtn: { flex: 1, borderRadius: 10, padding: 9, alignItems: 'center', borderWidth: 1, borderColor: '#0E9F8E' },
  rataAzioneBtnText: { fontSize: 13, color: '#0E9F8E', fontWeight: '600' },
  reminderBtnCompact: { flex: 0, paddingHorizontal: 12, borderColor: '#25D366' },
  reminderBtnCompactText: { fontSize: 13, color: '#25D366', fontWeight: '600' },
})
