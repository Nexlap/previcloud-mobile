import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View, type DimensionValue } from 'react-native'
import { MESI_BREVI } from '../../constants'
import { Abbonamento, RataAbbonamento } from '../../types'

type Props = {
  loading: boolean
  abbonamento: Abbonamento | null
  meseCorrente: number
  annoCorrente: number
  rataMeseCorrente: RataAbbonamento | undefined
  rateStoriche: RataAbbonamento[]
  abEspanso: boolean
  rataMiniAperta: string | null
  invioReminderLoading: string | null
  onCreate: () => void
  onToggleEspanso: () => void
  onRename: () => void
  onAddRata: (mese: number, anno: number, importo: number) => void
  onOpenPagamento: (rata: RataAbbonamento) => void
  onSendReminder: (rata: RataAbbonamento) => void
  onAzzeraPagamento: (rataId: string) => void
  onToggleRataMini: (rataId: string) => void
  onEditCanone: () => void
  onDeleteAbbonamento: () => void
}

function statoRataColore(stato: RataAbbonamento['stato']) {
  if (stato === 'incassato') return '#0E9F8E'
  if (stato === 'in_ritardo') return '#EF4444'
  if (stato === 'parziale') return '#F59E0B'
  return '#9CA3AF'
}

function statoRataLabel(stato: RataAbbonamento['stato']) {
  if (stato === 'incassato') return '\u2705 Incassato'
  if (stato === 'in_ritardo') return '\u26A0\uFE0F In ritardo'
  if (stato === 'parziale') return '\uD83D\uDD38 Parziale'
  return '\u23F3 Da incassare'
}

function statoRataIcon(stato: RataAbbonamento['stato']) {
  if (stato === 'incassato') return '\u2705'
  if (stato === 'in_ritardo') return '\u26A0\uFE0F'
  if (stato === 'parziale') return '\uD83D\uDD38'
  return '\u23F3'
}

function percentWidth(value: number): DimensionValue {
  return `${Math.max(0, Math.min(100, value))}%`
}

function residuoRata(rata: RataAbbonamento) {
  return rata.importo - (rata.acconto || 0)
}

type RataCardProps = {
  rata: RataAbbonamento
  corrente?: boolean
  expanded?: boolean
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
}: RataCardProps) {
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
      {rata.note && <Text style={styles.rataNota}>{rata.note}</Text>}
      <View style={styles.rataAzioni}>
        {rata.stato !== 'incassato' && (
          <TouchableOpacity style={styles.rataAzioneBtn} onPress={() => onOpenPagamento(rata)}>
            <Text style={styles.rataAzioneBtnText}>+ Registra pagamento</Text>
          </TouchableOpacity>
        )}
        {rata.stato !== 'incassato' && (
          <TouchableOpacity
            style={[styles.rataAzioneBtn, { borderColor: '#25D366', flex: 0, paddingHorizontal: 12 }]}
            onPress={() => onSendReminder(rata)}
            disabled={invioReminderLoading === rata.id}
          >
            {invioReminderLoading === rata.id
              ? <ActivityIndicator size="small" color="#25D366" />
              : <Text style={[styles.rataAzioneBtnText, { color: '#25D366' }]}>{'\uD83D\uDCE4'} WA</Text>
            }
          </TouchableOpacity>
        )}
        {rata.stato === 'incassato' && (
          <TouchableOpacity
            style={[styles.rataAzioneBtn, { borderColor: '#E5E7EB' }]}
            onPress={() => Alert.alert('Azzera', 'Riportare a "da incassare"?', [
              { text: 'Annulla', style: 'cancel' },
              { text: 'Azzera', style: 'destructive', onPress: () => onAzzeraPagamento(rata.id) }
            ])}
          >
            <Text style={[styles.rataAzioneBtnText, { color: '#9CA3AF' }]}>{'\u21A9'} Azzera</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  )
}

export function ClienteAbbonamentoTab({
  loading,
  abbonamento,
  meseCorrente,
  annoCorrente,
  rataMeseCorrente,
  rateStoriche,
  abEspanso,
  rataMiniAperta,
  invioReminderLoading,
  onCreate,
  onToggleEspanso,
  onRename,
  onAddRata,
  onOpenPagamento,
  onSendReminder,
  onAzzeraPagamento,
  onToggleRataMini,
  onEditCanone,
  onDeleteAbbonamento,
}: Props) {
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

  return (
    <>
      <TouchableOpacity style={styles.abHeader} onPress={onToggleEspanso}>
        <View style={{ flex: 1 }}>
          <Text style={styles.abHeaderNome}>{abbonamento.nome || 'Abbonamento N.1'}</Text>
          <Text style={styles.abHeaderSub}>
            {abbonamento.tipo === 'rate' ? 'Pagamento a rate' : 'Canone mensile'} · {'\u20AC'}{abbonamento.importo_default}/mese
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <TouchableOpacity onPress={onRename}>
            <Text style={{ fontSize: 16 }}>{'\u270F\uFE0F'}</Text>
          </TouchableOpacity>
          <Text style={styles.abHeaderArrow}>{abEspanso ? '\u25B2' : '\u25BC'}</Text>
        </View>
      </TouchableOpacity>

      {abEspanso && (
        <View style={{ gap: 10 }}>
          {rataMeseCorrente ? (
            <View style={styles.rataCardCorrente}>
              <View style={styles.rataRow}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.rataMese}>{MESI_BREVI[rataMeseCorrente.mese - 1]} {rataMeseCorrente.anno}</Text>
                    <Text style={styles.rataMeseTag}>corrente</Text>
                  </View>
                  {rataMeseCorrente.note ? <Text style={styles.rataNota}>{rataMeseCorrente.note}</Text> : null}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Text style={styles.rataImporto}>{'\u20AC'}{rataMeseCorrente.importo}</Text>
                  <Text style={[styles.rataStato, { color: statoRataColore(rataMeseCorrente.stato) }]}>
                    {statoRataLabel(rataMeseCorrente.stato)}
                  </Text>
                </View>
              </View>
              <RataDetail
                rata={rataMeseCorrente}
                invioReminderLoading={invioReminderLoading}
                onOpenPagamento={onOpenPagamento}
                onSendReminder={onSendReminder}
                onAzzeraPagamento={onAzzeraPagamento}
              />
            </View>
          ) : (
            <TouchableOpacity style={styles.abGeneraBtn} onPress={() => onAddRata(meseCorrente, annoCorrente, abbonamento.importo_default)}>
              <Text style={styles.abGeneraBtnText}>+ Aggiungi rata {MESI_BREVI[meseCorrente - 1]} {annoCorrente}</Text>
            </TouchableOpacity>
          )}

          {rateStoriche.length > 0 && (
            <View style={styles.rateStoricoContainer}>
              <Text style={styles.rateStoricoTitolo}>Storico rate</Text>
              {rateStoriche.map(rata => (
                <TouchableOpacity
                  key={rata.id}
                  style={styles.rataMiniTab}
                  onPress={() => onToggleRataMini(rata.id)}
                >
                  <View style={styles.rataMiniRow}>
                    <Text style={styles.rataMiniMese}>{MESI_BREVI[rata.mese - 1]} {rata.anno}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.rataMiniImporto}>{'\u20AC'}{rata.importo}</Text>
                      <Text style={{ fontSize: 14 }}>{statoRataIcon(rata.stato)}</Text>
                      <Text style={{ fontSize: 10, color: '#9CA3AF' }}>{rataMiniAperta === rata.id ? '\u25B2' : '\u25BC'}</Text>
                    </View>
                  </View>
                  {rataMiniAperta === rata.id && (
                    <View style={styles.rataMiniDetail}>
                      <RataDetail
                        rata={rata}
                        invioReminderLoading={invioReminderLoading}
                        onOpenPagamento={onOpenPagamento}
                        onSendReminder={onSendReminder}
                        onAzzeraPagamento={onAzzeraPagamento}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.abAzioneBtn} onPress={onEditCanone}>
              <Text style={styles.abAzioneBtnText}>{'\u270F\uFE0F'} Modifica canone</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.abAzioneBtn, { borderColor: '#FCA5A5' }]} onPress={() => {
              Alert.alert('Elimina abbonamento', 'Le rate storiche resteranno salvate. Vuoi procedere?', [
                { text: 'Annulla', style: 'cancel' },
                { text: 'Elimina', style: 'destructive', onPress: onDeleteAbbonamento }
              ])
            }}>
              <Text style={[styles.abAzioneBtnText, { color: '#EF4444' }]}>{'\uD83D\uDDD1'} Elimina</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.abAggiungiBtn} onPress={() => {
            const mesePrecedente = meseCorrente === 1 ? 12 : meseCorrente - 1
            const annoPrecedente = meseCorrente === 1 ? annoCorrente - 1 : annoCorrente
            onAddRata(mesePrecedente, annoPrecedente, abbonamento.importo_default)
          }}>
            <Text style={styles.abAggiungiText}>+ Aggiungi mese precedente</Text>
          </TouchableOpacity>

          {!rataMeseCorrente && (
            <TouchableOpacity style={styles.abAggiungiBtn} onPress={() => onAddRata(meseCorrente, annoCorrente, abbonamento.importo_default)}>
              <Text style={styles.abAggiungiText}>+ Aggiungi {MESI_BREVI[meseCorrente - 1]} {annoCorrente}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  abEmpty: { alignItems: 'center', paddingTop: 40, gap: 10 },
  abEmptyIcon: { fontSize: 40 },
  abEmptyTitle: { fontSize: 16, fontWeight: '700', color: '#0D1B2A' },
  abEmptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 20 },
  abCreaBtn: { backgroundColor: '#0D1B2A', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  abCreaBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  abHeader: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center' },
  abHeaderNome: { fontSize: 15, fontWeight: '700', color: '#0D1B2A' },
  abHeaderSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  abHeaderArrow: { fontSize: 12, color: '#9CA3AF' },
  abGeneraBtn: { backgroundColor: '#F7F8FA', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  abGeneraBtnText: { fontSize: 13, color: '#0E9F8E', fontWeight: '500' },
  abAggiungiBtn: { alignItems: 'center', padding: 12 },
  abAggiungiText: { fontSize: 13, color: '#0E9F8E', fontWeight: '500' },
  abAzioneBtn: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  abAzioneBtnText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  rataCardCorrente: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: '#0E9F8E', padding: 14, gap: 10 },
  rataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  rataMese: { fontSize: 14, fontWeight: '600', color: '#0D1B2A' },
  rataMeseTag: { fontSize: 10, fontWeight: '600', color: '#0E9F8E', backgroundColor: '#F0FDF4', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  rataNota: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  rataImporto: { fontSize: 15, fontWeight: '700', color: '#0D1B2A' },
  rataStato: { fontSize: 11, marginTop: 2, fontWeight: '500' },
  rataBarraContainer: { gap: 4 },
  rataBarra: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
  rataBarraFill: { height: 6, backgroundColor: '#F59E0B', borderRadius: 3 },
  rataBarraLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  rataBarraAcconto: { fontSize: 11, color: '#F59E0B', fontWeight: '500' },
  rataBarraResiduo: { fontSize: 11, color: '#EF4444', fontWeight: '500' },
  rataAzioni: { flexDirection: 'row', gap: 8 },
  rataAzioneBtn: { flex: 1, borderRadius: 10, padding: 9, alignItems: 'center', borderWidth: 1, borderColor: '#0E9F8E' },
  rataAzioneBtnText: { fontSize: 13, color: '#0E9F8E', fontWeight: '600' },
  rateStoricoContainer: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  rateStoricoTitolo: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.8, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8, textTransform: 'uppercase' },
  rataMiniTab: { borderTopWidth: 1, borderTopColor: '#F3F4F6', padding: 12 },
  rataMiniRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rataMiniMese: { fontSize: 13, fontWeight: '500', color: '#0D1B2A' },
  rataMiniImporto: { fontSize: 13, fontWeight: '600', color: '#0D1B2A' },
  rataMiniDetail: { marginTop: 10, gap: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10 },
})
