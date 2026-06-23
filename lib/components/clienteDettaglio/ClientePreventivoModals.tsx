import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { AppIcon } from '../icons/AppIcon'
import { StatoPreventivoIcon } from '../icons/StatoPreventivoIcon'
import { PreventivoSegnaPagatoSection } from '../preventivo/PreventivoSegnaPagatoSection'

type ClienteOpzione = { id: string; nome: string }

type Props = {
  modalStato: string | null
  onCloseStato: () => void
  onChangeStato: (preventivoId: string, stato: string) => void
  preventivoStatoCorrente?: string | null
  preventivoPagato?: boolean
  preventivoDataPagamento?: string | null
  mostraTogglePagato?: boolean
  onTogglePagato?: (pagato: boolean, dataPagamento?: string) => Promise<void> | void
  mostraModalSposta: string | null
  clientiDisponibili: ClienteOpzione[]
  onCloseSposta: () => void
  onSposta: (target: string, clienteId: string, clienteNome: string) => void
  mostraModalRinomina: string | null
  nuovoTitolo: string
  onChangeTitolo: (titolo: string) => void
  onCloseRinomina: () => void
  onSaveRinomina: (preventivoId: string, titolo: string) => void
}

const STATI = ['bozza', 'inviato', 'accettato', 'rifiutato']

export function ClientePreventivoModals({
  modalStato,
  onCloseStato,
  onChangeStato,
  preventivoStatoCorrente,
  preventivoPagato = false,
  preventivoDataPagamento = null,
  mostraTogglePagato = false,
  onTogglePagato,
  mostraModalSposta,
  clientiDisponibili,
  onCloseSposta,
  onSposta,
  mostraModalRinomina,
  nuovoTitolo,
  onChangeTitolo,
  onCloseRinomina,
  onSaveRinomina,
}: Props) {
  return (
    <>
      <Modal visible={modalStato !== null} transparent animationType="fade" onRequestClose={onCloseStato}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onCloseStato}>
          <TouchableOpacity style={styles.modalBox} activeOpacity={1} onPress={() => {}}>
            <Text style={styles.modalTitle}>Cambia stato</Text>
            {STATI.map(stato => (
              <TouchableOpacity
                key={stato}
                style={styles.modalOption}
                onPress={() => {
                  if (!modalStato) return
                  onChangeStato(modalStato, stato)
                  const restaAperto = stato === 'accettato' && mostraTogglePagato
                  if (!restaAperto) onCloseStato()
                }}
              >
                <View style={styles.modalOptionIcon}>
                  <StatoPreventivoIcon stato={stato} size={20} />
                </View>
                <Text style={styles.modalOptionText}>{stato}</Text>
              </TouchableOpacity>
            ))}
            {mostraTogglePagato && preventivoStatoCorrente === 'accettato' && onTogglePagato ? (
              <PreventivoSegnaPagatoSection
                pagato={preventivoPagato}
                dataPagamento={preventivoDataPagamento}
                onTogglePagato={onTogglePagato}
                onPagatoConfermato={onCloseStato}
              />
            ) : null}
            <TouchableOpacity style={styles.modalCancel} onPress={onCloseStato}>
              <Text style={styles.modalCancelText}>Annulla</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal visible={mostraModalSposta !== null} transparent animationType="fade" onRequestClose={onCloseSposta}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onCloseSposta}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Sposta a quale cliente?</Text>
            {clientiDisponibili.length === 0 ? (
              <Text style={styles.emptyText}>Nessun altro cliente disponibile</Text>
            ) : (
              clientiDisponibili.map(cliente => (
                <TouchableOpacity key={cliente.id} style={styles.modalOption} onPress={() => {
                  if (mostraModalSposta) onSposta(mostraModalSposta, cliente.id, cliente.nome)
                  onCloseSposta()
                }}>
                  <View style={styles.modalOptionIcon}>
                    <AppIcon name="user" size={20} color="#6B7280" />
                  </View>
                  <Text style={styles.modalOptionText}>{cliente.nome}</Text>
                </TouchableOpacity>
              ))
            )}
            <TouchableOpacity style={styles.modalCancel} onPress={onCloseSposta}>
              <Text style={styles.modalCancelText}>Annulla</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={mostraModalRinomina !== null} transparent animationType="fade" onRequestClose={onCloseRinomina}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onCloseRinomina}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Rinomina preventivo</Text>
            <TextInput style={styles.modalInput} value={nuovoTitolo} onChangeText={onChangeTitolo} placeholder="es. Preventivo caldaia" placeholderTextColor="#9CA3AF" autoFocus />
            <TouchableOpacity style={styles.modalSaveBtn} onPress={() => { if (mostraModalRinomina) onSaveRinomina(mostraModalRinomina, nuovoTitolo); onCloseRinomina() }}>
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
  modalBox: { backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '100%' },
  modalTitle: { fontSize: 16, fontWeight: '600', color: '#0D1B2A', marginBottom: 16, textAlign: 'center' },
  modalOption: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalOptionIcon: { width: 28, alignItems: 'center' as const, justifyContent: 'center' as const },
  modalOptionText: { fontSize: 15, color: '#0D1B2A', fontWeight: '500', textTransform: 'capitalize' },
  modalCancel: { paddingTop: 14, alignItems: 'center' },
  modalCancelText: { fontSize: 14, color: '#9CA3AF' },
  modalInput: { backgroundColor: '#F7F8FA', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 12, fontSize: 14, color: '#0D1B2A', marginBottom: 12 },
  modalSaveBtn: { backgroundColor: '#0D1B2A', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 8 },
  modalSaveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#9CA3AF', padding: 20 },
})
