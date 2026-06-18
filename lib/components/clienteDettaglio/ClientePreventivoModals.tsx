import { useState } from 'react'
import { Modal, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native'

type ClienteOpzione = { id: string; nome: string }

type Props = {
  modalStato: string | null
  onCloseStato: () => void
  onChangeStato: (preventivoId: string, stato: string) => void
  preventivoStatoCorrente?: string | null
  preventivoPagato?: boolean
  mostraTogglePagato?: boolean
  onTogglePagato?: (pagato: boolean) => Promise<void> | void
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

function statoIcon(stato: string) {
  if (stato === 'bozza') return '\uD83D\uDCDD'
  if (stato === 'inviato') return '\uD83D\uDCE4'
  if (stato === 'accettato') return '\u2705'
  return '\u274C'
}

export function ClientePreventivoModals({
  modalStato,
  onCloseStato,
  onChangeStato,
  preventivoStatoCorrente,
  preventivoPagato = false,
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
  const [salvandoPagato, setSalvandoPagato] = useState(false)

  async function handleTogglePagato(value: boolean) {
    if (!onTogglePagato) return
    setSalvandoPagato(true)
    try {
      await onTogglePagato(value)
    } finally {
      setSalvandoPagato(false)
    }
  }

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
                <Text style={styles.modalOptionIcon}>{statoIcon(stato)}</Text>
                <Text style={styles.modalOptionText}>{stato}</Text>
              </TouchableOpacity>
            ))}
            {mostraTogglePagato && preventivoStatoCorrente === 'accettato' ? (
              <>
                <View style={styles.pagatoDivider} />
                <View style={styles.pagatoRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pagatoLabel}>Segna come pagato</Text>
                    <Text style={styles.pagatoSub}>Registra l&apos;incasso del preventivo accettato</Text>
                  </View>
                  <Switch
                    value={preventivoPagato}
                    onValueChange={handleTogglePagato}
                    disabled={salvandoPagato}
                    trackColor={{ false: '#E5E7EB', true: '#0E9F8E' }}
                    thumbColor="#fff"
                  />
                </View>
              </>
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
                  <Text style={styles.modalOptionIcon}>{'\uD83D\uDC64'}</Text>
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
  modalOptionIcon: { fontSize: 20 },
  modalOptionText: { fontSize: 15, color: '#0D1B2A', fontWeight: '500', textTransform: 'capitalize' },
  pagatoDivider: { height: 1, backgroundColor: '#F3F4F6', marginTop: 8, marginBottom: 4 },
  pagatoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  pagatoLabel: { fontSize: 15, fontWeight: '600', color: '#0D1B2A' },
  pagatoSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  modalCancel: { paddingTop: 14, alignItems: 'center' },
  modalCancelText: { fontSize: 14, color: '#9CA3AF' },
  modalInput: { backgroundColor: '#F7F8FA', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 12, fontSize: 14, color: '#0D1B2A', marginBottom: 12 },
  modalSaveBtn: { backgroundColor: '#0D1B2A', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 8 },
  modalSaveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#9CA3AF', padding: 20 },
})
