import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { COLORS, MESI_BREVI } from '../../constants'
import { RataAbbonamento } from '../../types'

type Props = {
  mostraNuovo: boolean
  onCloseNuovo: () => void
  abImporto: string
  onChangeAbImporto: (v: string) => void
  abGiorno: string
  onChangeAbGiorno: (v: string) => void
  abMensilita: string
  onChangeAbMensilita: (v: string) => void
  onCreaAbbonamento: () => void

  mostraModifica: boolean
  onCloseModifica: () => void
  onAggiornaAbbonamento: () => void

  rataSelezionata: RataAbbonamento | null
  onCloseRata: () => void
  rataImporto: string
  onChangeRataImporto: (v: string) => void
  pagamentoImporto: string
  onChangePagamentoImporto: (v: string) => void
  pagamentoNota: string
  onChangePagamentoNota: (v: string) => void
  onConfermaPagamento: () => void

  mostraRinomina: boolean
  onCloseRinomina: () => void
  nomeAbTemp: string
  onChangeNomeAbTemp: (v: string) => void
  onSalvaRinomina: () => void

  mostraAggiungiRata: boolean
  onCloseAggiungiRata: () => void
  nuovaRataMese: string
  onChangeNuovaRataMese: (v: string) => void
  nuovaRataAnno: string
  onChangeNuovaRataAnno: (v: string) => void
  nuovaRataImporto: string
  onChangeNuovaRataImporto: (v: string) => void
  onConfermaAggiungiRata: () => void
}

export function ClienteAbbonamentoModals({
  mostraNuovo,
  onCloseNuovo,
  abImporto,
  onChangeAbImporto,
  abGiorno,
  onChangeAbGiorno,
  abMensilita,
  onChangeAbMensilita,
  onCreaAbbonamento,
  mostraModifica,
  onCloseModifica,
  onAggiornaAbbonamento,
  rataSelezionata,
  onCloseRata,
  rataImporto,
  onChangeRataImporto,
  pagamentoImporto,
  onChangePagamentoImporto,
  pagamentoNota,
  onChangePagamentoNota,
  onConfermaPagamento,
  mostraRinomina,
  onCloseRinomina,
  nomeAbTemp,
  onChangeNomeAbTemp,
  onSalvaRinomina,
  mostraAggiungiRata,
  onCloseAggiungiRata,
  nuovaRataMese,
  onChangeNuovaRataMese,
  nuovaRataAnno,
  onChangeNuovaRataAnno,
  nuovaRataImporto,
  onChangeNuovaRataImporto,
  onConfermaAggiungiRata,
}: Props) {
  return (
    <>
      <Modal visible={mostraNuovo} transparent animationType="fade" onRequestClose={onCloseNuovo}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onCloseNuovo}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Nuovo abbonamento</Text>
            <Text style={styles.modalFieldLabel}>IMPORTO MENSILE ({'\u20AC'})</Text>
            <TextInput style={[styles.modalInput, { marginTop: 6 }]} value={abImporto} onChangeText={onChangeAbImporto} placeholder="es. 500" placeholderTextColor={COLORS.textMuted} keyboardType="decimal-pad" autoFocus />
            <Text style={[styles.modalFieldLabel, { marginTop: 8 }]}>GIORNO SCADENZA</Text>
            <TextInput style={[styles.modalInput, { marginTop: 6 }]} value={abGiorno} onChangeText={onChangeAbGiorno} placeholder="es. 15" placeholderTextColor={COLORS.textMuted} keyboardType="number-pad" />
            <Text style={[styles.modalFieldLabel, { marginTop: 8 }]}>N° MENSILITA (opzionale)</Text>
            <TextInput style={[styles.modalInput, { marginTop: 6 }]} value={abMensilita} onChangeText={onChangeAbMensilita} placeholder="es. 12 - lascia vuoto per canone aperto" placeholderTextColor={COLORS.textMuted} keyboardType="number-pad" />
            <TouchableOpacity style={styles.modalSaveBtn} onPress={onCreaAbbonamento}>
              <Text style={styles.modalSaveBtnText}>Crea abbonamento</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={onCloseNuovo}>
              <Text style={styles.modalCancelText}>Annulla</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={mostraModifica} transparent animationType="fade" onRequestClose={onCloseModifica}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onCloseModifica}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Modifica abbonamento</Text>
            <Text style={styles.modalFieldLabel}>IMPORTO MENSILE ({'\u20AC'})</Text>
            <TextInput style={[styles.modalInput, { marginTop: 6 }]} value={abImporto} onChangeText={onChangeAbImporto} keyboardType="decimal-pad" autoFocus />
            <Text style={[styles.modalFieldLabel, { marginTop: 8 }]}>GIORNO SCADENZA</Text>
            <TextInput style={[styles.modalInput, { marginTop: 6 }]} value={abGiorno} onChangeText={onChangeAbGiorno} keyboardType="number-pad" />
            <TouchableOpacity style={styles.modalSaveBtn} onPress={onAggiornaAbbonamento}>
              <Text style={styles.modalSaveBtnText}>Salva</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={onCloseModifica}>
              <Text style={styles.modalCancelText}>Annulla</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={rataSelezionata !== null} transparent animationType="fade" onRequestClose={onCloseRata}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onCloseRata}>
          <View style={styles.modalBox}>
            {rataSelezionata && (
              <>
                <Text style={styles.modalTitle}>{MESI_BREVI[rataSelezionata.mese - 1]} {rataSelezionata.anno}</Text>
                <View style={styles.modalRiepilogo}>
                  <View style={styles.modalRiepilogoRow}>
                    <Text style={styles.modalRiepilogoLabel}>Totale</Text>
                    <Text style={styles.modalRiepilogoVal}>{'\u20AC'}{rataSelezionata.importo}</Text>
                  </View>
                  {(rataSelezionata.acconto || 0) > 0 && (
                    <View style={styles.modalRiepilogoRow}>
                      <Text style={styles.modalRiepilogoLabel}>Gia incassato</Text>
                      <Text style={[styles.modalRiepilogoVal, { color: COLORS.accent }]}>{'\u20AC'}{rataSelezionata.acconto}</Text>
                    </View>
                  )}
                  <View style={styles.modalRiepilogoRow}>
                    <Text style={styles.modalRiepilogoLabel}>Residuo</Text>
                    <Text style={[styles.modalRiepilogoVal, { color: COLORS.danger }]}>{'\u20AC'}{rataSelezionata.importo - (rataSelezionata.acconto || 0)}</Text>
                  </View>
                </View>
                <Text style={styles.modalFieldLabel}>IMPORTO RATA ({'\u20AC'})</Text>
                <TextInput
                  style={[styles.modalInput, { marginTop: 6 }]}
                  value={rataImporto}
                  onChangeText={onChangeRataImporto}
                  keyboardType="decimal-pad"
                  placeholder="Modifica importo rata"
                  placeholderTextColor={COLORS.textMuted}
                />
                <Text style={styles.modalFieldLabel}>IMPORTO RICEVUTO ORA ({'\u20AC'})</Text>
                <TextInput style={[styles.modalInput, { marginTop: 6 }]} value={pagamentoImporto} onChangeText={onChangePagamentoImporto} keyboardType="decimal-pad" autoFocus />
                <Text style={[styles.modalFieldLabel, { marginTop: 8 }]}>NOTA (opzionale)</Text>
                <TextInput style={[styles.modalInput, { marginTop: 6 }]} value={pagamentoNota} onChangeText={onChangePagamentoNota} placeholder="es. Bonifico 10 giugno" placeholderTextColor={COLORS.textMuted} />
                <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: COLORS.accent }]} onPress={onConfermaPagamento}>
                  <Text style={styles.modalSaveBtnText}>{'\u2713'} Registra pagamento</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalCancel} onPress={onCloseRata}>
                  <Text style={styles.modalCancelText}>Annulla</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={mostraAggiungiRata} transparent animationType="fade" onRequestClose={onCloseAggiungiRata}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onCloseAggiungiRata}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Aggiungi rata</Text>
            <Text style={styles.modalFieldLabel}>MESE (1-12)</Text>
            <TextInput
              style={[styles.modalInput, { marginTop: 6 }]}
              value={nuovaRataMese}
              onChangeText={onChangeNuovaRataMese}
              placeholder="es. 6"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="number-pad"
              autoFocus
            />
            <Text style={[styles.modalFieldLabel, { marginTop: 8 }]}>ANNO</Text>
            <TextInput
              style={[styles.modalInput, { marginTop: 6 }]}
              value={nuovaRataAnno}
              onChangeText={onChangeNuovaRataAnno}
              placeholder="es. 2026"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="number-pad"
            />
            <Text style={[styles.modalFieldLabel, { marginTop: 8 }]}>IMPORTO ({'\u20AC'})</Text>
            <TextInput
              style={[styles.modalInput, { marginTop: 6 }]}
              value={nuovaRataImporto}
              onChangeText={onChangeNuovaRataImporto}
              placeholder="es. 500"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="decimal-pad"
            />
            <TouchableOpacity style={styles.modalSaveBtn} onPress={onConfermaAggiungiRata}>
              <Text style={styles.modalSaveBtnText}>Aggiungi rata</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={onCloseAggiungiRata}>
              <Text style={styles.modalCancelText}>Annulla</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={mostraRinomina} transparent animationType="fade" onRequestClose={onCloseRinomina}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onCloseRinomina}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Rinomina abbonamento</Text>
            <TextInput style={styles.modalInput} value={nomeAbTemp} onChangeText={onChangeNomeAbTemp} placeholder="es. Sito web mensile" placeholderTextColor={COLORS.textMuted} autoFocus />
            <TouchableOpacity style={styles.modalSaveBtn} onPress={onSalvaRinomina}>
              <Text style={styles.modalSaveBtnText}>Salva</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={onCloseRinomina}>
              <Text style={styles.modalCancelText}>Annulla</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  modalBox: { backgroundColor: COLORS.white, borderRadius: 20, padding: 20, width: '100%' },
  modalTitle: { fontSize: 16, fontWeight: '600', color: COLORS.primary, marginBottom: 16, textAlign: 'center' },
  modalCancel: { paddingTop: 14, alignItems: 'center' },
  modalCancelText: { fontSize: 14, color: COLORS.textMuted },
  modalInput: { backgroundColor: COLORS.background, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.border, padding: 12, fontSize: 14, color: COLORS.primary, marginBottom: 12 },
  modalSaveBtn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 8 },
  modalSaveBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  modalFieldLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted, letterSpacing: 0.8 },
  modalRiepilogo: { backgroundColor: COLORS.background, borderRadius: 12, padding: 12, marginBottom: 16, gap: 6 },
  modalRiepilogoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  modalRiepilogoLabel: { fontSize: 13, color: COLORS.textSecondary },
  modalRiepilogoVal: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
})
